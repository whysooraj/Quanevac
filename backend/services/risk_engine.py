import json
import os

# Load JSON datasets — cached at module level to avoid repeated disk reads
DATA_DIR = os.path.join(os.path.dirname(__file__), '..', 'data')
_cache = {}

def load_json(filename):
    if filename in _cache:
        return _cache[filename]
    path = os.path.join(DATA_DIR, filename)
    if os.path.exists(path):
        with open(path, 'r', encoding='utf-8') as f:
            _cache[filename] = json.load(f)
            return _cache[filename]
    return []

def get_region_data(region_name="Puri"):
    all_villages = load_json("villages.json")
    all_shelters = load_json("shelters.json")
    
    villages = [
        {
            "id": v["village_id"],
            "name": v["name"],
            "population": v["population"],
            "lat": v["latitude"],
            "lng": v["longitude"]
        } for v in all_villages if v.get("district") == region_name
    ]
    
    shelters = [
        {
            "id": s["shelter_id"],
            "name": s["name"],
            "capacity": s["capacity"],
            "lat": s["latitude"],
            "lng": s["longitude"]
        } for s in all_shelters if s.get("district") == region_name
    ]
    
    if villages:
        center_lat = sum(v["lat"] for v in villages) / len(villages)
        center_lng = sum(v["lng"] for v in villages) / len(villages)
        center = [center_lat, center_lng]
    else:
        center = [19.8, 85.8]
        
    connections = []
    
    for v in villages:
        connected = False
        closest_shelter = None
        min_dist = float('inf')
        
        for s in shelters:
            lat_diff = abs(v["lat"] - s["lat"])
            lng_diff = abs(v["lng"] - s["lng"])
            # Haversine approximation: 1 lat degree ≈ 111 km, 1 lng degree ≈ 111*cos(lat) km
            dist_km = (lat_diff ** 2 + lng_diff ** 2) ** 0.5 * 111.0
            
            if dist_km < min_dist:
                min_dist = dist_km
                closest_shelter = s
                
            if dist_km < 80:
                connected = True
                time_hrs = max(0.5, dist_km / 40.0)
                # Coastal proximity as flood-risk proxy (higher lng = closer to Bay of Bengal)
                coastal_risk = min(0.9, max(0.1, ((s["lng"] + v["lng"]) / 2 - 84.0) * 0.15))
                
                connections.append({
                    "source": v["id"],
                    "target": s["id"],
                    "base_time_hrs": round(time_hrs, 2),
                    "flood_risk_base": round(coastal_risk, 2)
                })
                
        if not connected and closest_shelter:
            time_hrs = max(0.5, min_dist / 40.0)
            coastal_risk = min(0.9, max(0.1, ((closest_shelter["lng"] + v["lng"]) / 2 - 84.0) * 0.15))
            connections.append({
                "source": v["id"],
                "target": closest_shelter["id"],
                "base_time_hrs": round(time_hrs, 2),
                "flood_risk_base": round(coastal_risk, 2)
            })
            
    return {
        "region_name": region_name,
        "center": center,
        "villages": villages,
        "shelters": shelters,
        "connections": connections
    }

async def get_alert_threat(region_name):
    """
    Fetches live cyclone data from GDACS API (async, non-blocking).
    Falls back to a simulation scenario for the hackathon demo.
    """
    import httpx
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(
                "https://www.gdacs.org/gdacsapi/api/events/geteventlist/MAP?eventlist=TC"
            )
            if response.status_code == 200:
                data = response.json()
                for feature in data.get("features", []):
                    props = feature.get("properties", {})
                    coords = feature.get("geometry", {}).get("coordinates", [0, 0])
                    lng, lat = coords[0], coords[1]
                    
                    # Bay of Bengal / Arabian Sea bounding box
                    if 5.0 <= lat <= 30.0 and 65.0 <= lng <= 100.0:
                        alert_level = props.get("alertlevel", "Orange")
                        name = props.get("name", "Unknown Cyclone")
                        return {
                            "level": "HIGH" if alert_level.lower() == "red" else "MODERATE",
                            "message": f"🔴 LIVE GDACS ALERT: Cyclone {name} at [{round(lat,2)}°N, {round(lng,2)}°E]. Evacuation recommended."
                        }
    except Exception as e:
        print(f"[GDACS] API unavailable: {e}")
    
    # Simulated fallback (no live storms in region right now)
    sim = "(Simulation) "
    scenarios = {
        "Puri":         ("HIGH",     f"{sim}IMD Red Alert: Cyclone Fani making landfall near Puri coast."),
        "Kendrapara":   ("HIGH",     f"{sim}IMD Red Alert: Severe coastal storm surges near Kendrapara."),
        "Jagatsinghpur":("MODERATE", f"{sim}IMD Yellow Alert: Heavy rainfall and surges near Paradip."),
        "Ganjam":       ("LOW",      f"{sim}No immediate cyclone warnings for Ganjam district."),
    }
    level, msg = scenarios.get(region_name, ("LOW", f"{sim}No active warnings."))
    return {"level": level, "message": msg}
