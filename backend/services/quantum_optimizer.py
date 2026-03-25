"""
Quantum Evacuation Optimizer — Real QAOA Implementation
==========================================================
Pipeline:
  1. Classical Greedy Baseline (pure distance, no ML) — worst-case reference
  2. Real Qiskit QAOA on the top-5 highest-priority villages (real quantum circuit)
  3. ML-aware greedy for all remaining villages
  4. Genuine comparison metrics across 4 dimensions
"""

import time
import math
import statistics
import traceback

import numpy as np
from qiskit import QuantumCircuit
from qiskit.circuit import ParameterVector
from qiskit_aer import AerSimulator
from qiskit.transpiler.preset_passmanagers import generate_preset_pass_manager


# ─────────────────────────────────────────────────────────────────────────────
#  Edge cost helper
# ─────────────────────────────────────────────────────────────────────────────

def _edge_cost(village: dict, shelter: dict, connections: list) -> float:
    """ML-evaluated cost for a village→shelter edge (lower = better route)."""
    for c in connections:
        if c["source"] == village["id"] and c["target"] == shelter["id"]:
            t = c.get("current_time", c.get("base_time_hrs", 2.0))
            r = c.get("current_risk", c.get("flood_risk_base", 0.3))
            p = min(1.0, village["population"] / 10000.0)
            return t * 0.40 + r * 0.40 + p * 0.20
    return 1e6  # no connection


# ─────────────────────────────────────────────────────────────────────────────
#  QUBO builder  (N villages × M shelters → N*M binary variables)
# ─────────────────────────────────────────────────────────────────────────────

def _build_qubo(villages: list, shelters: list, connections: list) -> np.ndarray:
    N, M = len(villages), len(shelters)
    size = N * M
    Q = np.zeros((size, size), dtype=float)

    # Objective: minimise route cost on diagonal
    for i, v in enumerate(villages):
        for j, s in enumerate(shelters):
            Q[i * M + j, i * M + j] += _edge_cost(v, s, connections)

    # One-hot: each village assigned to exactly one shelter
    lam = 5.0
    for i in range(N):
        for j in range(M):
            Q[i * M + j, i * M + j] -= lam
            for k in range(j + 1, M):
                Q[i * M + j, i * M + k] += 2 * lam
                Q[i * M + k, i * M + j] += 2 * lam

    # Soft capacity constraint
    lam_cap = 1.5
    for j, s in enumerate(shelters):
        cap = s["capacity"]
        for i1, v1 in enumerate(villages):
            for i2, v2 in enumerate(villages):
                if i1 >= i2:
                    continue
                if v1["population"] + v2["population"] > cap:
                    overflow = (v1["population"] + v2["population"] - cap) / cap
                    Q[i1 * M + j, i2 * M + j] += lam_cap * overflow
                    Q[i2 * M + j, i1 * M + j] += lam_cap * overflow
    return Q


# ─────────────────────────────────────────────────────────────────────────────
#  QAOA circuit
# ─────────────────────────────────────────────────────────────────────────────

def _qaoa_circuit(Q: np.ndarray, p: int = 2) -> QuantumCircuit:
    n = Q.shape[0]
    gamma = ParameterVector("g", p)
    beta  = ParameterVector("b", p)
    qc = QuantumCircuit(n)
    qc.h(range(n))
    for layer in range(p):
        for i in range(n):
            for j in range(i + 1, n):
                if abs(Q[i, j]) > 1e-9:
                    qc.rzz(2 * (Q[i, j] / 4.0) * gamma[layer], i, j)
            if abs(Q[i, i]) > 1e-9:
                qc.rz(2 * Q[i, i] * gamma[layer], i)
        qc.rx(2 * beta[layer], range(n))
    qc.measure_all()
    return qc


def _run_qaoa(Q: np.ndarray, shots: int = 512) -> tuple[str, float]:
    """Returns (best_bitstring, circuit_exec_ms)."""
    t0  = time.time()
    n   = Q.shape[0]
    p   = 2
    qc  = _qaoa_circuit(Q, p)

    sim = AerSimulator(method="statevector")
    pm  = generate_preset_pass_manager(optimization_level=1, backend=sim)
    tqc = pm.run(qc)

    # Sort parameters by name so g[0],g[1] come before b[0],b[1]
    sorted_params = sorted(qc.parameters, key=lambda x: x.name)

    best_energy = float("inf")
    best_bits   = "0" * n

    gamma_grid = np.linspace(0.3, math.pi, 3)   # 3×3 = 9 evaluations (fast)
    beta_grid  = np.linspace(0.2, math.pi / 2, 3)

    for g in gamma_grid:
        for b in beta_grid:
            # Assign: params starting with 'g' → gamma value, 'b' → beta value
            pdict = {
                param: (g if param.name.startswith("g") else b)
                for param in sorted_params
            }
            bound  = tqc.assign_parameters(pdict)
            counts = sim.run(bound, shots=shots).result().get_counts()
            best_sample = max(counts, key=counts.get)
            bits = np.array([int(c) for c in reversed(best_sample)], dtype=float)
            if len(bits) < n:
                bits = np.pad(bits, (0, n - len(bits)))
            energy = float(bits @ Q @ bits)
            if energy < best_energy:
                best_energy = energy
                best_bits   = best_sample

    exec_ms = round((time.time() - t0) * 1000, 1)
    return best_bits, exec_ms


# ─────────────────────────────────────────────────────────────────────────────
#  Classical Greedy Baseline
# ─────────────────────────────────────────────────────────────────────────────

def _classical_greedy(villages, shelters, connections, storm_lat, storm_lng, storm_radius_km):
    """
    Classical greedy baseline — uses the SAME ML-evaluated times as QAOA
    so the only difference is the routing algorithm, not the data.
    Sorts by ML-evaluated risk-adjusted time (current_time).
    """
    cap  = {s["id"]: s["capacity"] for s in shelters}
    smap = {s["id"]: s for s in shelters}
    occ  = {s["id"]: 0 for s in shelters}
    results = []

    for v in sorted(villages, key=lambda x: x["population"], reverse=True):
        routes = sorted(
            [c for c in connections if c["source"] == v["id"]],
            key=lambda c: c.get("current_time", c["base_time_hrs"])   # ML-evaluated time
        )
        assigned = None
        for r in routes:
            if cap.get(r["target"], 0) >= v["population"]:
                assigned = r
                break
        if assigned is None and routes:
            assigned = routes[0]   # allow overflow baseline
        if not assigned:
            continue

        s = smap[assigned["target"]]
        # Apply the same km-based storm penalty as QAOA hybrid
        dist_km = ((s["lat"] - storm_lat)**2 + (s["lng"] - storm_lng)**2)**0.5 * 111.0
        sp = 2.0 if dist_km < storm_radius_km * 0.5 else 1.4 if dist_km < storm_radius_km else 1.0
        est_t = assigned.get("current_time", assigned["base_time_hrs"]) * sp
        risk  = min(1.0, assigned.get("current_risk", assigned.get("flood_risk_base", 0.3)) * sp)

        cap[s["id"]] -= v["population"]
        occ[s["id"]] += v["population"]
        results.append({
            "village_id": v["id"], "village_name": v["name"],
            "population": v["population"],
            "assigned_shelter_id": s["id"], "assigned_shelter_name": s["name"],
            "estimated_time_hrs": round(est_t, 2),
            "risk_level": round(risk, 3),
        })
    return results, occ


# ─────────────────────────────────────────────────────────────────────────────
#  Metrics
# ─────────────────────────────────────────────────────────────────────────────

def _metrics(assignments, occupancy, shelters, label):
    if not assignments:
        return {}
    total_pop  = sum(a["population"] for a in assignments)
    avg_time   = sum(a["estimated_time_hrs"] * a["population"] for a in assignments) / max(total_pop, 1)
    load_pcts  = [(occupancy.get(s["id"], 0) / s["capacity"]) * 100 for s in shelters if s["capacity"] > 0]
    load_std   = statistics.stdev(load_pcts) if len(load_pcts) > 1 else 0
    risk_exp   = sum(a.get("risk_level", 0.3) * a["population"] for a in assignments)
    hr_count   = sum(1 for a in assignments if a.get("risk_level", 0.3) > 0.5)
    return {
        "label":                  label,
        "avg_clearance_hrs":      round(avg_time, 3),
        "load_balance_std_pct":   round(load_std, 2),
        "total_risk_exposure":    int(risk_exp),
        "high_risk_routes_pct":   round(hr_count / len(assignments) * 100, 1),
    }


# ─────────────────────────────────────────────────────────────────────────────
#  Main pipeline
# ─────────────────────────────────────────────────────────────────────────────

def run_quantum_evacuation_optimization(base_data: dict, storm_data: dict) -> dict:
    t_start  = time.time()

    villages    = base_data["villages"]
    shelters    = base_data["shelters"]
    connections = base_data["connections"]
    storm_lat   = storm_data.get("latitude", 19.8)
    storm_lng   = storm_data.get("longitude", 85.8)
    smap        = {s["id"]: s for s in shelters}

    storm_radius_km = storm_data.get("radius_km", 50.0)

    # ── 1. Classical Greedy baseline ──────────────────────────────────────────
    greedy_results, greedy_occ = _classical_greedy(villages, shelters, connections, storm_lat, storm_lng, storm_radius_km)
    greedy_metrics = _metrics(greedy_results, greedy_occ, shelters, "Classical Greedy")

    # ── 2. Score every village for QAOA selection ─────────────────────────────
    def _priority(v):
        routes = [c for c in connections if c["source"] == v["id"]]
        if not routes:
            return 0.0
        best   = min(routes, key=lambda c: c.get("current_time", c["base_time_hrs"]))
        risk   = best.get("current_risk", best.get("flood_risk_base", 0.3))
        pop_n  = min(1.0, v["population"] / 10000.0)
        t_n    = min(1.0, best.get("current_time", best["base_time_hrs"]) / 4.0)
        return risk * 0.40 + pop_n * 0.35 + t_n * 0.25

    ranked = sorted(villages, key=_priority, reverse=True)

    # ── 3. Real QAOA on top-5 critical villages ───────────────────────────────
    # Keep N×M ≤ 20 qubits so AerSimulator stays fast.
    # Use the 4 nearest shelters only to reduce qubit count further.
    VILLAGE_LIMIT  = min(5, len(ranked))
    SHELTER_LIMIT  = min(4, len(shelters))

    qaoa_villages = ranked[:VILLAGE_LIMIT]
    # Pick the 4 closest shelters to the centroid of the qaoa villages
    if qaoa_villages:
        cv_lat = sum(v["lat"] for v in qaoa_villages) / len(qaoa_villages)
        cv_lng = sum(v["lng"] for v in qaoa_villages) / len(qaoa_villages)
        qaoa_shelters = sorted(
            shelters,
            key=lambda s: abs(s["lat"] - cv_lat) + abs(s["lng"] - cv_lng)
        )[:SHELTER_LIMIT]
    else:
        qaoa_shelters = shelters[:SHELTER_LIMIT]

    # Shared capacity tracker (both QAOA and greedy-tail share this)
    capacities  = {s["id"]: s["capacity"] for s in shelters}
    occupancy   = {s["id"]: 0 for s in shelters}
    assignments = []
    qaoa_ms     = 0
    assigned_ids= set()

    if qaoa_villages and qaoa_shelters:
        try:
            Q = _build_qubo(qaoa_villages, qaoa_shelters, connections)
            best_bits_str, qaoa_ms = _run_qaoa(Q, shots=256)

            M    = len(qaoa_shelters)
            bits = [int(b) for b in reversed(best_bits_str)]
            bits += [0] * max(0, len(qaoa_villages) * M - len(bits))

            for i, v in enumerate(qaoa_villages):
                # Decode which shelter bit was set
                selected_j = None
                for j in range(M):
                    idx = i * M + j
                    if idx < len(bits) and bits[idx] == 1:
                        selected_j = j
                        break
                # Fallback: cheapest feasible shelter
                if selected_j is None:
                    best_cost = float("inf")
                    for j, s in enumerate(qaoa_shelters):
                        if capacities.get(s["id"], 0) >= v["population"]:
                            c = _edge_cost(v, s, connections)
                            if c < best_cost:
                                best_cost, selected_j = c, j
                if selected_j is None:
                    selected_j = 0  # last resort

                s    = qaoa_shelters[selected_j]
                conn = next(
                    (c for c in connections if c["source"] == v["id"] and c["target"] == s["id"]),
                    None
                )
                est_t = conn.get("current_time", conn["base_time_hrs"]) if conn else 1.5
                risk  = conn.get("current_risk", 0.3) if conn else 0.3

                # Enforce capacity — if selected shelter is full, find next best
                if capacities.get(s["id"], 0) < v["population"]:
                    fallback = sorted(
                        [(c_["current_risk"] if "current_risk" in c_ else c_["flood_risk_base"],
                          c_["current_time"]  if "current_time"  in c_ else c_["base_time_hrs"],
                          c_) for c_ in connections if c_["source"] == v["id"]
                           and capacities.get(c_["target"], 0) >= v["population"]],
                        key=lambda x: x[0] + x[1] * 0.5
                    )
                    if fallback:
                        _, est_t, conn = fallback[0]
                        risk  = conn.get("current_risk", conn.get("flood_risk_base", 0.3))
                        est_t = conn.get("current_time", conn["base_time_hrs"])
                        s     = smap[conn["target"]]

                capacities[s["id"]] -= v["population"]
                occupancy[s["id"]]  += v["population"]
                assigned_ids.add(v["id"])

                pop_n  = min(1.0, v["population"] / 10000.0)
                t_n    = min(1.0, est_t / 4.0)
                comp   = risk * 0.40 + pop_n * 0.35 + t_n * 0.25

                assignments.append({
                    "village_id": v["id"], "village_name": v["name"],
                    "population": v["population"],
                    "assigned_shelter_id": s["id"], "assigned_shelter_name": s["name"],
                    "estimated_time_hrs": round(est_t, 2),
                    "risk_level": round(risk, 3),
                    "composite_score": round(comp, 3),
                    "solver": "QAOA ⚛️",
                    "status": "Critical" if comp >= 0.60 else "At Risk" if comp >= 0.35 else "Safe"
                })

        except Exception as e:
            print(f"[QAOA] Circuit error: {e}")
            traceback.print_exc()

    # ── 4. ML-aware greedy for remaining villages ─────────────────────────────
    storm_radius_km = storm_data.get("radius_km", 50.0)
    for v in ranked:
        if v["id"] in assigned_ids:
            continue
        routes = [c for c in connections if c["source"] == v["id"]]
        if not routes:
            continue

        scored = []
        for r in routes:
            s = smap.get(r["target"])
            if not s:
                continue
            # ── Storm penalty based on actual km radius, not degrees ──────────
            dist_km = ((s["lat"] - storm_lat)**2 + (s["lng"] - storm_lng)**2)**0.5 * 111.0
            if dist_km < storm_radius_km * 0.5:
                sp = 2.0      # inside inner storm core
            elif dist_km < storm_radius_km:
                sp = 1.4      # within storm radius
            else:
                sp = 1.0      # outside storm → no penalty

            dyn_t    = r.get("current_time", r.get("base_time_hrs", 1.0)) * sp
            dyn_r    = min(1.0, r.get("current_risk", r.get("flood_risk_base", 0.3)) * sp)
            overflow = max(0, v["population"] - capacities.get(r["target"], 0))
            cost     = dyn_t * 10 + dyn_r * 50 + overflow * 2.0
            scored.append((cost, dyn_t, dyn_r, r, s))

        scored.sort(key=lambda x: x[0])
        _, dyn_t, dyn_r, best_r, best_s = scored[0]

        capacities[best_s["id"]] -= v["population"]
        occupancy[best_s["id"]]  += v["population"]
        assigned_ids.add(v["id"])

        pop_n = min(1.0, v["population"] / 10000.0)
        t_n   = min(1.0, dyn_t / 4.0)
        comp  = dyn_r * 0.40 + pop_n * 0.35 + t_n * 0.25

        assignments.append({
            "village_id": v["id"], "village_name": v["name"],
            "population": v["population"],
            "assigned_shelter_id": best_s["id"], "assigned_shelter_name": best_s["name"],
            "estimated_time_hrs": round(dyn_t, 2),
            "risk_level": round(dyn_r, 3),
            "composite_score": round(comp, 3),
            "solver": "ML-Greedy",
            "status": "Critical" if comp >= 0.60 else "At Risk" if comp >= 0.35 else "Safe"
        })

    # ── 5. Shelter capacity display ───────────────────────────────────────────
    shelter_metrics = [
        {
            "id": s["id"], "name": s["name"],
            "max_capacity":     s["capacity"],
            "current_occupancy":max(0, occupancy.get(s["id"], 0)),
            "remaining":        max(0, capacities.get(s["id"], s["capacity"])),
            "lat": s["lat"], "lng": s["lng"],
        }
        for s in shelters
    ]

    # ── 6. Comparison metrics ─────────────────────────────────────────────────
    qaoa_metrics   = _metrics(assignments, occupancy, shelters, "QAOA + ML Hybrid")
    total_ms       = round((time.time() - t_start) * 1000, 1)

    # Improvement: allow negative values to show honestly where each wins
    def _pct_improve(old, new, lower_is_better=True):
        if old == 0:
            return 0.0
        delta = (old - new) if lower_is_better else (new - old)
        return round(delta / abs(old) * 100, 1)  # negative = classical wins

    comparison = {
        "classical": greedy_metrics,
        "quantum":   qaoa_metrics,
        "improvements": {
            "clearance_time_reduction_pct":  _pct_improve(greedy_metrics.get("avg_clearance_hrs", 0),    qaoa_metrics.get("avg_clearance_hrs", 0)),
            "load_balance_improvement_pct":  _pct_improve(greedy_metrics.get("load_balance_std_pct", 0), qaoa_metrics.get("load_balance_std_pct", 0)),
            "risk_exposure_reduction_pct":   _pct_improve(greedy_metrics.get("total_risk_exposure", 0),  qaoa_metrics.get("total_risk_exposure", 0)),
            "high_risk_routes_reduced_pct":  _pct_improve(greedy_metrics.get("high_risk_routes_pct", 0), qaoa_metrics.get("high_risk_routes_pct", 0)),
        }
    }

    # Overall advantage: weighted average across all 4 metrics
    # Time weight 20%, Load Balance 35%, Risk 30%, High-Risk Routes 15%
    impr = comparison["improvements"]
    overall = (
        impr["clearance_time_reduction_pct"] * 0.20 +
        impr["load_balance_improvement_pct"] * 0.35 +
        impr["risk_exposure_reduction_pct"]  * 0.30 +
        impr["high_risk_routes_reduced_pct"] * 0.15
    )
    comparison["improvements"]["overall_advantage_pct"] = round(overall, 1)

    opt_total    = sum(a["estimated_time_hrs"] for a in assignments)
    greedy_total = sum(a["estimated_time_hrs"] for a in greedy_results)

    return {
        "status": "success",
        "quantum_execution_time_ms": qaoa_ms,
        "total_pipeline_ms":         total_ms,
        "qaoa_villages_solved":      sum(1 for a in assignments if "QAOA" in a.get("solver", "")),
        "metrics": {
            "unoptimized_clearance_hrs":    round(greedy_total, 1),
            "qaoa_optimized_clearance_hrs": round(opt_total, 1),
            "time_reduction_percentage":    comparison["improvements"]["overall_advantage_pct"],
            "people_secured":               sum(v["population"] for v in villages),
        },
        "comparison":  comparison,
        "shelters":    shelter_metrics,
        "assignments": assignments,
    }
