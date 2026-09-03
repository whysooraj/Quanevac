import asyncio
import random
import time

import httpx
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from services.ml_evaluator import evaluate_network_risk
from services.quantum_optimizer import run_quantum_evacuation_optimization
from services.risk_engine import get_alert_threat, get_region_data

app = FastAPI(title="Quantum Evacuation Optimizer API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class StormTrackInput(BaseModel):
    region: str = "Puri"
    latitude: float
    longitude: float
    radius_km: float
    wind_speed_kmh: float = 150.0  # Category-3 default
    rainfall_mm: float = 200.0  # Heavy rain default
    provider: str = "aer"  # "aer" | "ibm_quantum" | "classical"


@app.get("/api/providers")
async def list_quantum_providers():
    from services.quantum_provider import get_quantum_provider
    import os
    has_ibm_token = bool(os.environ.get("IBM_QUANTUM_TOKEN"))
    return {
        "active_default": os.environ.get("QUANTUM_PROVIDER", "aer"),
        "providers": [
            {
                "id": "aer",
                "name": get_quantum_provider("aer").name(),
                "description": "Local Qiskit Aer statevector simulator (Fast, Offline)",
                "status": "ready"
            },
            {
                "id": "ibm_quantum",
                "name": get_quantum_provider("ibm_quantum").name(),
                "description": "IBM Quantum Runtime Service (QPU Hardware)",
                "status": "ready" if has_ibm_token else "requires_token"
            },
            {
                "id": "classical",
                "name": get_quantum_provider("classical").name(),
                "description": "Classical Heuristic Fallback Solver",
                "status": "ready"
            }
        ]
    }



_alert_triggered = False


@app.get("/api/alerts")
async def check_alerts():
    global _alert_triggered
    if not _alert_triggered and random.random() < 0.2:
        _alert_triggered = True
        return {
            "active": True,
            "storm": {
                "latitude": 19.85,
                "longitude": 85.85,
                "radius_km": 50,
                "name": "Cyclone Fani (Simulated Auto-Alert)",
            },
        }
    return {"active": _alert_triggered}


@app.post("/api/alerts/reset")
async def reset_alerts():
    global _alert_triggered
    _alert_triggered = False
    return {"status": "reset"}


@app.get("/api/data/{region}")
async def fetch_data_region(region: str):
    return get_region_data(region)


@app.get("/api/threat/{region}")
async def fetch_threat(region: str):
    return await get_alert_threat(region)


# ── In-memory geometry cache: key = rounded coords, value = [[lat,lng],...]
# Persists for the lifetime of the process — no OSRM re-fetch on repeated optimize calls
_geometry_cache: dict = {}


def _cache_key(start_lng, start_lat, end_lng, end_lat) -> str:
    return f"{round(start_lat, 3)},{round(start_lng, 3)}-{round(end_lat, 3)},{round(end_lng, 3)}"


async def fetch_osrm_geometry(
    client: httpx.AsyncClient, start_lng, start_lat, end_lng, end_lat
):
    """Fetch road geometry from OSRM — returns cached result if available."""
    key = _cache_key(start_lng, start_lat, end_lng, end_lat)
    if key in _geometry_cache:
        return _geometry_cache[key]  # instant — no network call

    try:
        url = f"https://router.project-osrm.org/route/v1/driving/{start_lng},{
            start_lat};{end_lng},{end_lat}?geometries=geojson&overview=full"
        r = await client.get(url, timeout=6.0)
        if r.status_code == 200:
            data = r.json()
            if data.get("routes"):
                geom = [
                    [c[1], c[0]] for c in data["routes"][0]["geometry"]["coordinates"]
                ]
                _geometry_cache[key] = geom  # store for future calls
                return geom
        else:
            print(f"OSRM returned status {r.status_code}")
    except Exception as e:
        print(f"OSRM fetch failed: {e}")
    return None


@app.post("/api/optimize")
async def optimize_evacuation(storm: StormTrackInput):
    """Full pipeline: Base Data → ML Risk → QAOA → OSRM Roads (all parallel)."""
    base_data = get_region_data(storm.region)

    evaluated_connections, ml_latency = evaluate_network_risk(
        base_data["connections"],
        storm.dict(),
        base_data["villages"],
        base_data["shelters"],
    )
    base_data["connections"] = evaluated_connections

    result = run_quantum_evacuation_optimization(base_data, storm.dict(), provider_type=storm.provider)

    assignments = result.get("assignments", [])

    # Build coord lookup
    coords_map = {v["id"]: v for v in base_data["villages"]}
    coords_map.update({s["id"]: s for s in base_data["shelters"]})

    # ── All OSRM requests in parallel, pool limited to 10 connections ────────
    limits = httpx.Limits(max_connections=10, max_keepalive_connections=5)
    async with httpx.AsyncClient(limits=limits) as client:
        tasks = []
        for a in assignments:
            v = coords_map.get(a["village_id"])
            s = coords_map.get(a["assigned_shelter_id"])
            if v and s:
                tasks.append(
                    fetch_osrm_geometry(
                        client, v["lng"], v["lat"], s["lng"], s["lat"])
                )
            else:
                tasks.append(asyncio.create_task(
                    asyncio.sleep(0, result=None)))

        geometries = await asyncio.gather(*tasks)

    for i, assignment in enumerate(assignments):
        geom = geometries[i] if i < len(geometries) else None
        if not geom:
            # Fallback to straight line if OSRM failed so the route is NEVER invisible
            v = coords_map.get(assignment["village_id"])
            s = coords_map.get(assignment["assigned_shelter_id"])
            if v and s:
                geom = [[v["lat"], v["lng"]], [s["lat"], s["lng"]]]
            else:
                geom = []
        assignment["road_geometry"] = geom

    result["assignments"] = assignments
    result["ml_execution_time_ms"] = ml_latency
    return result


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
