"""
Quantum Evacuation Optimizer — Quantum Backend Provider Abstraction Layer
=============================================================================
Provides a unified abstract interface (QuantumProvider) and concrete provider implementations:
  1. AerSimulatorProvider: Local Qiskit Aer statevector simulator (default, fast, offline)
  2. IBMQuantumCloudProvider: IBM Quantum Runtime Service (QPU hardware / IBM Cloud)
  3. ClassicalFallbackProvider: High-speed greedy heuristic solver
"""

import os
import time
import math
import logging
from abc import ABC, abstractmethod
import numpy as np

from qiskit import QuantumCircuit
from qiskit.circuit import ParameterVector

logger = logging.getLogger("quanevac.quantum_provider")


def build_qaoa_circuit(Q: np.ndarray, p: int = 2) -> QuantumCircuit:
    """Builds a parameterised QAOA ansatz circuit for a given QUBO matrix Q."""
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


class QuantumProvider(ABC):
    """Abstract base class for all Quantum & Classical Optimization Providers."""

    @abstractmethod
    def name(self) -> str:
        """Human-readable provider name."""
        pass

    @abstractmethod
    def run_qubo(self, Q: np.ndarray, shots: int = 512) -> tuple[str, float]:
        """
        Executes optimization over QUBO matrix Q.
        Returns: (best_bitstring, execution_time_ms)
        """
        pass


class AerSimulatorProvider(QuantumProvider):
    """Executes QAOA on the local Qiskit Aer statevector simulator."""

    def name(self) -> str:
        return "Qiskit Aer Simulator (Local)"

    def run_qubo(self, Q: np.ndarray, shots: int = 512) -> tuple[str, float]:
        from qiskit_aer import AerSimulator
        from qiskit.transpiler.preset_passmanagers import generate_preset_pass_manager

        t0 = time.time()
        n = Q.shape[0]
        p = 2
        qc = build_qaoa_circuit(Q, p)

        sim = AerSimulator(method="statevector")
        pm = generate_preset_pass_manager(optimization_level=1, backend=sim)
        tqc = pm.run(qc)

        sorted_params = sorted(qc.parameters, key=lambda x: x.name)
        best_energy = float("inf")
        best_bits = "0" * n

        gamma_grid = np.linspace(0.3, math.pi, 3)
        beta_grid = np.linspace(0.2, math.pi / 2, 3)

        for g in gamma_grid:
            for b in beta_grid:
                pdict = {
                    param: (g if param.name.startswith("g") else b)
                    for param in sorted_params
                }
                bound = tqc.assign_parameters(pdict)
                counts = sim.run(bound, shots=shots).result().get_counts()
                best_sample = max(counts, key=counts.get)
                bits = np.array([int(c) for c in reversed(best_sample)], dtype=float)
                if len(bits) < n:
                    bits = np.pad(bits, (0, n - len(bits)))
                energy = float(bits @ Q @ bits)
                if energy < best_energy:
                    best_energy = energy
                    best_bits = best_sample

        exec_ms = round((time.time() - t0) * 1000, 1)
        return best_bits, exec_ms


class IBMQuantumCloudProvider(QuantumProvider):
    """
    Executes QAOA on IBM Quantum hardware or Qiskit Runtime Service.
    Requires environment variable `IBM_QUANTUM_TOKEN`.
    If no token is present, logs warning and falls back to Aer Simulator.
    """

    def __init__(self, token: str = None, instance: str = "ibm-q/open/main"):
        self.token = token or os.environ.get("IBM_QUANTUM_TOKEN")
        self.instance = instance

    def name(self) -> str:
        return "IBM Quantum Cloud (QPU Runtime)" if self.token else "IBM Quantum (Aer Fallback - No Token)"

    def run_qubo(self, Q: np.ndarray, shots: int = 512) -> tuple[str, float]:
        if not self.token:
            logger.warning("IBM_QUANTUM_TOKEN not set. Falling back to local Aer simulator.")
            fallback = AerSimulatorProvider()
            return fallback.run_qubo(Q, shots)

        try:
            from qiskit_ibm_runtime import QiskitRuntimeService, SamplerV2 as Sampler
            service = QiskitRuntimeService(channel="ibm_quantum", token=self.token, instance=self.instance)
            backend = service.least_busy(operational=True, simulator=False)
            logger.info(f"Connected to IBM QPU: {backend.name}")

            t0 = time.time()
            n = Q.shape[0]
            qc = build_qaoa_circuit(Q, p=1)
            
            sampler = Sampler(mode=backend)
            job = sampler.run([qc], shots=shots)
            result = job.result()
            counts = result[0].data.meas.get_counts()

            best_sample = max(counts, key=counts.get)
            exec_ms = round((time.time() - t0) * 1000, 1)
            return best_sample, exec_ms
        except Exception as e:
            logger.error(f"IBM Quantum Runtime execution failed: {e}. Falling back to Aer.")
            fallback = AerSimulatorProvider()
            return fallback.run_qubo(Q, shots)


class ClassicalFallbackProvider(QuantumProvider):
    """Deterministic classical solver for baseline comparisons or low-latency modes."""

    def name(self) -> str:
        return "Classical Heuristic Solver"

    def run_qubo(self, Q: np.ndarray, shots: int = 512) -> tuple[str, float]:
        t0 = time.time()
        n = Q.shape[0]
        # Diagonal elements contain single-variable cost biases
        diag = np.diag(Q)
        best_bits = "".join(["1" if d < 0 else "0" for d in diag])
        if len(best_bits) < n:
            best_bits = best_bits.ljust(n, "0")
        exec_ms = round((time.time() - t0) * 1000, 1)
        return best_bits, exec_ms


def get_quantum_provider(provider_type: str = "aer") -> QuantumProvider:
    """Factory function to select the appropriate QuantumProvider instance."""
    p_type = (provider_type or os.environ.get("QUANTUM_PROVIDER", "aer")).lower()

    if p_type in ["ibm", "ibm_quantum", "qpu"]:
        return IBMQuantumCloudProvider()
    elif p_type in ["classical", "heuristic"]:
        return ClassicalFallbackProvider()
    else:
        return AerSimulatorProvider()
