from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from services.risk_engine import get_region_data, get_alert_threat
from services.ml_evaluator import evaluate_network_risk
from services.quantum_optimizer import run_quantum_evacuation_optimization
import time
import random
import httpx
import asyncio

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
                "name": "Cyclone Fani (Simulated Auto-Alert)"
            }
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

async def fetch_osrm_geometry(client: httpx.AsyncClient, start_lng: float, start_lat: float, end_lng: float, end_lat: float):
    """Fetch real road geometry from OSRM public API."""
    try:
        url = f"https://router.project-osrm.org/route/v1/driving/{start_lng},{start_lat};{end_lng},{end_lat}?geometries=geojson&overview=simplified"
        r = await client.get(url, timeout=10.0)
        if r.status_code == 200:
            data = r.json()
            if data.get("routes"):
                # OSRM returns [lng, lat] coords — flip to Leaflet's [lat, lng]
                coords = [[c[1], c[0]] for c in data["routes"][0]["geometry"]["coordinates"]]
                return coords
    except Exception as e:
        print(f"OSRM error: {e}")
    return None

@app.post("/api/optimize")
async def optimize_evacuation(storm: StormTrackInput):
    """
    Runs the full pipeline:
    1. Base Data Retrieval
    2. ML LSTM Risk Evaluation
    3. QAOA Route Optimization
    4. Parallel OSRM Road Geometry Fetching (all routes at once)
    """
    base_data = get_region_data(storm.region)

    evaluated_connections, ml_latency = evaluate_network_risk(
        base_data["connections"],
        storm.dict(),
        base_data["villages"],
        base_data["shelters"]
    )
    base_data["connections"] = evaluated_connections

    result = run_quantum_evacuation_optimization(base_data, storm.dict())

    assignments = result.get("assignments", [])

    # Build coord lookup
    coords_map = {v["id"]: v for v in base_data["villages"]}
    coords_map.update({s["id"]: s for s in base_data["shelters"]})

    # Fire ALL OSRM requests simultaneously using asyncio.gather
    async with httpx.AsyncClient() as client:
        tasks = []
        for assignment in assignments:
            v = coords_map.get(assignment["village_id"])
            s = coords_map.get(assignment["assigned_shelter_id"])
            if v and s:
                tasks.append(fetch_osrm_geometry(client, v["lng"], v["lat"], s["lng"], s["lat"]))
            else:
                async def _noop(): return None
                tasks.append(_noop())

        geometries = await asyncio.gather(*tasks)

    for i, assignment in enumerate(assignments):
        assignment["road_geometry"] = geometries[i]  # list[lat,lng] or None (frontend falls back to straight line)

    result["assignments"] = assignments
    result["ml_execution_time_ms"] = ml_latency
    return result

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
