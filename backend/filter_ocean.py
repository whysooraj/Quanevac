import json

def is_on_land(lat, lng):
    # Coastline approximation
    if lng < 85.8:
        # Segment 1: Chhatrapur to Puri
        min_lat = 19.35 + (lng - 84.98) * (19.8 - 19.35) / (85.8 - 84.98)
        return lat >= min_lat - 0.02
    elif lng < 86.1:
        # Segment 2: Puri to Konark
        min_lat = 19.8 + (lng - 85.8) * (19.88 - 19.8) / (86.09 - 85.8)
        return lat >= min_lat - 0.02
    else:
        # Segment 3: Konark to Paradip
        min_lat = 19.88 + (lng - 86.09) * (20.3 - 19.88) / (86.7 - 86.09)
        return lat >= min_lat - 0.02

with open('data/villages.json', 'r') as f:
    villages = json.load(f)

print(f"Original villages: {len(villages)}")
kept_villages = [v for v in villages if is_on_land(v['latitude'], v['longitude'])]
removed = [v for v in villages if not is_on_land(v['latitude'], v['longitude'])]
print(f"Removed {len(removed)} villages in the sea:")
for v in removed:
    print(f"  {v['village_id']}: {v['name']} ({v['latitude']}, {v['longitude']})")

with open('data/villages.json', 'w') as f:
    json.dump(kept_villages, f, indent=2)

with open('data/shelters.json', 'r') as f:
    shelters = json.load(f)

print(f"Original shelters: {len(shelters)}")
kept_shelters = [s for s in shelters if is_on_land(s['latitude'], s['longitude'])]
removed_s = [s for s in shelters if not is_on_land(s['latitude'], s['longitude'])]
print(f"Removed {len(removed_s)} shelters in the sea:")
for s in removed_s:
    print(f"  {s['shelter_id']}: {s['name']} ({s['latitude']}, {s['longitude']})")

with open('data/shelters.json', 'w') as f:
    json.dump(kept_shelters, f, indent=2)
