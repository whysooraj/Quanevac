import React, { useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Circle, Popup, Polyline, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});



// ── Single route that fetches its own road geometry ───────────────────────
function RoutePolyline({ assignment, village, shelter, stormTrack }) {
  const positions = assignment.road_geometry;
  if (!positions || positions.length < 2) return null;

  // ── Color: based on ML-evaluated road risk_level (0→1), NOT composite score
  const risk  = assignment.risk_level ?? 0;
  const color = risk >= 0.55 ? '#ef4444'    // High risk  → red
              : risk >= 0.30 ? '#f59e0b'    // Medium risk → amber
              : '#10b981';                  // Low risk   → green

  // ── Dashed: true if the route midpoint is geometrically inside the storm circle
  let throughStorm = false;
  if (stormTrack && positions.length > 0) {
    const mid = positions[Math.floor(positions.length / 2)];
    const dLat = mid[0] - stormTrack.latitude;
    const dLng = mid[1] - stormTrack.longitude;
    const distKm = Math.sqrt(dLat * dLat + dLng * dLng) * 111.0;
    throughStorm = distKm < (stormTrack.radius_km ?? 50);
  }

  const weight = Math.max(2, Math.min(7, assignment.population / 350));

  return (
    <Polyline
      positions={positions}
      pathOptions={{
        color,
        weight,
        opacity: throughStorm ? 0.55 : 0.88,
        dashArray: throughStorm ? '7,5' : null,
      }}
      className={risk >= 0.55 ? 'flowing-route-critical' : 'flowing-route'}
    >
      <Popup>
        <div style={{ color: '#333', fontSize: '0.85em' }}>
          <strong>{assignment.village_name}</strong> → {assignment.assigned_shelter_name}<br/>
          👥 Pop: {assignment.population.toLocaleString()}<br/>
          ⏱ {assignment.estimated_time_hrs}h &nbsp;
          🌊 Road Risk: <strong>{Math.round(risk * 100)}%</strong><br/>
          🎯 Priority: <strong>{Math.round((assignment.composite_score ?? risk) * 100)}%</strong>
          {' — '}<span style={{ color }}>{assignment.status}</span><br/>
          {assignment.solver && <span style={{ color: '#818cf8', fontSize: '0.75em' }}>⚛ {assignment.solver}</span>}<br/>
          {throughStorm && <span style={{ color: '#ef4444' }}>⚠️ Route passes through storm zone</span>}
        </div>
      </Popup>
    </Polyline>
  );
}

function StormTracker({ onStormMove }) {
  useMapEvents({ click(e) { onStormMove(e.latlng.lat, e.latlng.lng); } });
  return null;
}

function MapUpdater({ center }) {
  const map = useMap();
  useEffect(() => { if (center) map.flyTo(center, 10, { duration: 1.5 }); }, [center]);
  return null;
}

export default function EvacuationMap({ baseData, optimizedData, stormTrack, onStormMove }) {
  const center = baseData?.center || [19.8, 85.8];

  return (
    <MapContainer center={center} zoom={10} style={{ height: '100%', width: '100%' }} zoomControl={false}>
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; OpenStreetMap contributors'
      />
      <MapUpdater center={baseData?.center} />
      <StormTracker onStormMove={onStormMove} />

      {/* Villages */}
      {baseData?.villages.map(v => (
        <CircleMarker key={v.id} center={[v.lat, v.lng]} radius={5}
          pathOptions={{ color: '#06b6d4', fillColor: '#06b6d4', fillOpacity: 0.7 }}>
          <Popup><div style={{ color: '#333' }}><strong>{v.name}</strong><br/>Pop: {v.population.toLocaleString()}</div></Popup>
        </CircleMarker>
      ))}

      {/* Shelters */}
      {baseData?.shelters.map(s => {
        const metrics = optimizedData?.shelters?.find(ms => ms.id === s.id);
        const cap = metrics?.max_capacity ?? s.capacity;
        const occ = metrics?.current_occupancy ?? 0;
        const pct = (occ / cap) * 100;
        return (
          <CircleMarker key={s.id} center={[s.lat, s.lng]} radius={8}
            pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.9, weight: 3 }}>
            <Popup>
              <div style={{ color: '#333' }}>
                <strong>{s.name}</strong>
                <div style={{ margin: '6px 0 3px', fontSize: '0.9em' }}>
                  {occ.toLocaleString()} / {cap.toLocaleString()} occupied
                </div>
                <div style={{ width: 150, height: 10, background: '#e2e8f0', borderRadius: 5, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`,
                    background: pct > 90 ? '#ef4444' : pct > 70 ? '#f59e0b' : '#10b981' }} />
                </div>
                <div style={{ fontSize: '0.8em', color: '#64748b', marginTop: 3 }}>
                  {metrics?.remaining > 0 ? `${metrics.remaining.toLocaleString()} spots left` : 'FULL'}
                </div>
              </div>
            </Popup>
          </CircleMarker>
        );
      })}

      {/* Storm impact zone — visual opacity and thickness scales with wind speed and rainfall */}
      {(() => {
        const wind = stormTrack.wind_speed_kmh || 150;
        const rain = stormTrack.rainfall_mm || 200;
        const rad = stormTrack.radius_km || 50;
        
        // Combined intensity 0.0 -> 1.0
        const intensity = Math.min(1.0, (wind / 220) * 0.6 + (rain / 400) * 0.4);

        return (
          <>
            {/* Outer Influence Zone */}
            <Circle center={[stormTrack.latitude, stormTrack.longitude]}
              radius={rad * 1000}
              pathOptions={{ 
                color: '#ef4444', fillColor: '#ef4444', 
                fillOpacity: 0.01 + intensity * 0.15, 
                dashArray: '10,10', 
                weight: 1 + intensity * 2
              }} 
            />
            {/* Inner Core Danger Zone */}
            <Circle center={[stormTrack.latitude, stormTrack.longitude]}
              radius={rad * 1000 * 0.5}
              pathOptions={{ 
                color: '#ef4444', fillColor: '#ef4444', 
                fillOpacity: 0.05 + intensity * 0.35, 
                dashArray: '5,5', 
                weight: 2 + intensity * 3
              }}>
              <Popup>
                <strong>Cyclone Impact Zone</strong><br />
                Routes inside suffer extreme ML flood & wind penalties.<br/>
                <em>Click anywhere to reposition the storm → auto re-routes!</em>
              </Popup>
            </Circle>
            {/* Storm Eye */}
            <CircleMarker center={[stormTrack.latitude, stormTrack.longitude]}
              radius={3 + intensity * 5} pathOptions={{ color: '#ef4444', fillColor: '#ef4444', fillOpacity: 1, weight: 2 }} />
          </>
        );
      })()}

      {/* Optimised routes — each fetches its own road geometry lazily */}
      {optimizedData?.assignments.map((assignment, idx) => {
        const village = baseData?.villages.find(v => v.id === assignment.village_id);
        const shelter = baseData?.shelters.find(s => s.id === assignment.assigned_shelter_id);
        if (!village || !shelter) return null;
        return (
          <RoutePolyline
            key={`${assignment.village_id}-${assignment.assigned_shelter_id}-${idx}`}
            assignment={assignment}
            village={village}
            shelter={shelter}
            stormTrack={stormTrack}
          />
        );
      })}
    </MapContainer>
  );
}
