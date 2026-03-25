import time
import torch
import torch.nn as nn

# ─────────────────────────────────────────────────────────────
#  LSTM Model Definition
# ─────────────────────────────────────────────────────────────
class EvacuationRiskLSTM(nn.Module):
    """
    Temporal LSTM that takes a 3-step storm-track forecast sequence
    (T=0, T+12h, T+24h) and outputs a road-flood risk probability [0,1].
    
    Input per timestep (5 features):
        1. Normalised distance to storm eye
        2. Elevation proxy
        3. Road quality proxy
        4. Expected rainfall
        5. Wind speed
    """
    def __init__(self, input_size=5, hidden_size=32, num_layers=2, dropout=0.2):
        super().__init__()
        self.lstm = nn.LSTM(
            input_size, hidden_size, num_layers,
            batch_first=True, dropout=dropout
        )
        self.head = nn.Sequential(
            nn.Linear(hidden_size, 16),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(16, 1),
            nn.Sigmoid()
        )

    def forward(self, x):
        out, _ = self.lstm(x)
        return self.head(out[:, -1, :])  # last timestep only

# Deterministic weight seed — ensures stable risk scores between API calls
torch.manual_seed(2019)  # 2019 = Cyclone Fani year
_ml_model = EvacuationRiskLSTM()
_ml_model.eval()

# ─────────────────────────────────────────────────────────────
#  Feature Engineering
# ─────────────────────────────────────────────────────────────
def _build_feature_sequence(route: dict, storm_track: dict) -> list[list[float]]:
    """
    Build a 3-timestep feature sequence for a single village→shelter route.
    Uses a deterministic hash of the route endpoints as elevation/road proxies
    so identical routes always produce identical risk scores.
    """
    h = abs(hash(str(route["source"]) + str(route["target"])))
    elevation_norm = (2 + (h % 48)) / 50.0       # 0.04–1.0
    road_quality_norm = (3 + (h % 7)) / 10.0     # 0.3–1.0

    storm_lat      = float(storm_track.get("latitude",       19.8))
    storm_lng      = float(storm_track.get("longitude",      85.8))
    radius_km      = float(storm_track.get("radius_km",      50.0))
    wind_speed_kmh = float(storm_track.get("wind_speed_kmh", 150.0))
    rainfall_mm    = float(storm_track.get("rainfall_mm",    200.0))

    # Normalise user params: 220 km/h ≈ Cat-5 max, 400 mm ≈ extreme rainfall
    wind_intensity = min(1.0, wind_speed_kmh / 220.0)   # 0 → 1 scale
    rain_intensity = min(1.0, rainfall_mm    / 400.0)   # 0 → 1 scale

    target_lat = route.get("target_lat", 19.8)
    target_lng = route.get("target_lng", 85.8)
    source_lat = route.get("source_lat", target_lat)
    source_lng = route.get("source_lng", target_lng)

    mid_lat = (source_lat + target_lat) / 2.0
    mid_lng = (source_lng + target_lng) / 2.0

    sequence = []
    for t in range(3):
        # Storm moves NNW ~15 km every 12 hours (typical Bay of Bengal track)
        cur_lat = storm_lat + t * 0.135
        cur_lng = storm_lng - t * 0.045

        dist_s = ((source_lat - cur_lat) ** 2 + (source_lng - cur_lng) ** 2) ** 0.5 * 111.0
        dist_t = ((target_lat - cur_lat) ** 2 + (target_lng - cur_lng) ** 2) ** 0.5 * 111.0
        dist_m = ((mid_lat - cur_lat) ** 2 + (mid_lng - cur_lng) ** 2) ** 0.5 * 111.0
        
        # Risk is driven by the part of the route that gets CLOSEST to the storm eye
        dist_km = min(dist_s, dist_t, dist_m)

        if dist_km < radius_km:
            rain_norm = 0.75 + 0.25 * (1 - dist_km / radius_km)
            wind_norm = 0.70 + 0.25 * (1 - dist_km / radius_km)
        elif dist_km < radius_km * 2:
            factor = 1 - (dist_km - radius_km) / radius_km
            rain_norm = 0.20 + 0.45 * factor
            wind_norm = 0.25 + 0.40 * factor
        else:
            rain_norm = 0.02 + 0.18 * (radius_km / max(dist_km, 1))
            wind_norm = 0.05 + 0.15 * (radius_km / max(dist_km, 1))

        # Scale by user-specified intensity — a Cat-5 amplifies risk everywhere
        rain_norm = rain_norm * (0.1 + 0.9 * rain_intensity)
        wind_norm = wind_norm * (0.1 + 0.9 * wind_intensity)

        sequence.append([
            min(1.0, dist_km / 500.0),
            elevation_norm,
            road_quality_norm,
            min(1.0, rain_norm),
            min(1.0, wind_norm),
        ])

    return sequence

# ─────────────────────────────────────────────────────────────
#  Inference
# ─────────────────────────────────────────────────────────────
def _predict_risk(sequence: list[list[float]]) -> float:
    """
    Computes a physically-anchored risk score.
    The base risk is derived from actual storm proximity features;
    the LSTM contributes a ±0.15 variance modifier on top.
    """
    # Physics-based risk from last timestep features:
    # features = [dist_norm, elevation_norm, road_quality_norm, rain_norm, wind_norm]
    last = sequence[-1]
    dist_norm  = last[0]   # 0 = right at storm, 1 = 500km away
    dist_km    = dist_norm * 500.0   # back to kilometres for threshold checks
    rain_norm  = last[3]
    wind_norm  = last[4]

    # Proximity risk: decays linearly from 1.0 (at storm eye) to 0.0 at 60 km
    # >60 km → low proximity risk, 30-60 km → moderate, <30 km → high
    proximity_risk = max(0.0, 1.0 - dist_km / 60.0)

    # Environmental risk: weighted sum of rain + wind
    env_risk = (rain_norm * 0.55 + wind_norm * 0.45)

    # Physics base combines proximity and environment
    physics_base = proximity_risk * 0.7 + env_risk * 0.3

    # LSTM provides a small deterministic variance modifier
    t = torch.tensor([sequence], dtype=torch.float32)
    with torch.no_grad():
        lstm_raw = float(_ml_model(t).item())  # 0.0-1.0 (biased center)
    # Map LSTM output to [-0.15, +0.15] modifier
    lstm_modifier = (lstm_raw - 0.5) * 0.30

    final_risk = max(0.05, min(0.95, physics_base + lstm_modifier))
    return round(final_risk, 3)

# ─────────────────────────────────────────────────────────────
#  Public API
# ─────────────────────────────────────────────────────────────
def evaluate_network_risk(
    connections: list[dict],
    storm_data: dict,
    villages: list[dict],
    shelters: list[dict],
) -> tuple[list[dict], float]:
    """
    Runs the ML risk pipeline over every connection in the routing graph.
    Returns enriched connections and total inference latency in ms.
    """
    start = time.time()

    coords = {n["id"]: (n["lat"], n["lng"]) for n in villages + shelters}

    enriched = []
    for conn in connections:
        source_coords = coords.get(conn["source"])
        target_coords = coords.get(conn["target"])
        if target_coords is None or source_coords is None:
            enriched.append(conn)
            continue

        route_ext = {
            **conn, 
            "target_lat": target_coords[0], "target_lng": target_coords[1],
            "source_lat": source_coords[0], "source_lng": source_coords[1],
        }
        seq = _build_feature_sequence(route_ext, storm_data)
        risk = _predict_risk(seq)

        # Time penalty: higher risk → longer effective evacuation window
        penalty_factor = 1.0 + risk * 2.5
        enriched.append({
            **conn,
            "current_risk": risk,
            "current_time": round(conn["base_time_hrs"] * penalty_factor, 2),
        })

    latency_ms = round((time.time() - start) * 1000, 2)
    return enriched, latency_ms
