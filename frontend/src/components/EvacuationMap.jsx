import React, { useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Circle, Popup, Polyline, useMapEvents, useMap, Marker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Navigation, Info, ZoomIn, ZoomOut, RotateCcw, Play, Pause } from 'lucide-react';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom storm trajectory directional arrow / pulse icon
const createTrajectoryIcon = (label, color = '#ef4444') => {
  return L.divIcon({
    className: 'custom-trajectory-marker',
    html: `
      <div style="
        background: ${color};
        color: #fff;
        font-weight: 800;
        font-size: 10px;
        padding: 2px 6px;
        border-radius: 10px;
        border: 1px solid rgba(255,255,255,0.4);
        box-shadow: 0 0 10px ${color};
        white-space: nowrap;
        transform: translate(-50%, -50%);
        font-family: 'Inter', sans-serif;
      ">
        ${label}
      </div>
    `,
    iconSize: [40, 20],
    iconAnchor: [20, 10],
  });
};

// ── Single route that fetches its own road geometry ───────────────────────
function RoutePolyline({ assignment, village, shelter, stormTrack }) {
  const positions = assignment.road_geometry;
  if (!positions || positions.length < 2) return null;

  const risk  = assignment.risk_level ?? 0;
  const color = risk >= 0.55 ? '#ef4444'    // High risk  → red
              : risk >= 0.30 ? '#f59e0b'    // Medium risk → amber
              : '#10b981';                  // Low risk   → green

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
        <div style={{ color: '#1e293b', fontSize: '0.85em', fontFamily: 'Inter, sans-serif' }}>
          <strong style={{ fontSize: '1.05em', color: '#0f172a' }}>{assignment.village_name}</strong> → {assignment.assigned_shelter_name}<br/>
          👥 Pop: <strong>{assignment.population.toLocaleString()}</strong><br/>
          ⏱ Est. Time: <strong>{assignment.estimated_time_hrs} hrs</strong><br/>
          🌊 Road Risk: <span style={{ color, fontWeight: 'bold' }}>{Math.round(risk * 100)}%</span><br/>
          🎯 Priority Score: <strong>{Math.round((assignment.composite_score ?? risk) * 100)}%</strong>
          {' — '}<span style={{ color, fontWeight: 600 }}>{assignment.status}</span><br/>
          {assignment.solver && <span style={{ color: '#6366f1', fontSize: '0.8em', fontWeight: 600 }}>⚛ Solver: {assignment.solver}</span>}<br/>
          {throughStorm && <span style={{ color: '#ef4444', fontWeight: 'bold', fontSize: '0.8em' }}>⚠️ Passes through cyclone zone</span>}
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
  useEffect(() => { if (center) map.flyTo(center, 10, { duration: 1.2 }); }, [center]);
  return null;
}

function CustomMapControls({ center }) {
  const map = useMap();
  return (
    <div className="map-custom-controls">
      <button onClick={() => map.zoomIn()} title="Zoom In"><ZoomIn size={16} /></button>
      <button onClick={() => map.zoomOut()} title="Zoom Out"><ZoomOut size={16} /></button>
      {center && <button onClick={() => map.flyTo(center, 10)} title="Reset View"><RotateCcw size={16} /></button>}
    </div>
  );
}

export default function EvacuationMap({ baseData, optimizedData, stormTrack, onStormMove }) {
  const center = baseData?.center || [19.8, 85.8];

  // ── Calculate 4-point Cyclone Forecast Trajectory (NNW movement ~15 km / 12h) ──
  const curLat = stormTrack.latitude;
  const curLng = stormTrack.longitude;
  const rad = stormTrack.radius_km || 50;
  const wind = stormTrack.wind_speed_kmh || 150;
  const rain = stormTrack.rainfall_mm || 200;
  const intensity = Math.min(1.0, (wind / 220) * 0.6 + (rain / 400) * 0.4);

  // Projected trajectory waypoints: T=0h, T+6h, T+12h, T+24h
  const trajectoryPoints = [
    { label: 'T=0h (Eye)', lat: curLat, lng: curLng },
    { label: '+6h',  lat: curLat + 0.0675, lng: curLng - 0.0225 },
    { label: '+12h', lat: curLat + 0.135,  lng: curLng - 0.045 },
    { label: '+24h (Landfall)', lat: curLat + 0.270,  lng: curLng - 0.090 },
  ];

  const trajectoryLine = trajectoryPoints.map(p => [p.lat, p.lng]);

  return (
    <div className="map-wrapper" style={{ position: 'relative', width: '100%', height: '100%' }}>
      <MapContainer center={center} zoom={10} style={{ height: '100%', width: '100%' }} zoomControl={false}>
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"
          attribution="Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ"
        />
        <MapUpdater center={baseData?.center} />
        <StormTracker onStormMove={onStormMove} />
        <CustomMapControls center={baseData?.center} />

        {/* Villages */}
        {baseData?.villages.map(v => (
          <CircleMarker key={v.id} center={[v.lat, v.lng]} radius={5}
            pathOptions={{ color: '#06b6d4', fillColor: '#06b6d4', fillOpacity: 0.8 }}>
            <Popup><div style={{ color: '#1e293b' }}><strong>🏡 {v.name}</strong><br/>Population: {v.population.toLocaleString()}</div></Popup>
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
                <div style={{ color: '#1e293b' }}>
                  <strong>🛡️ {s.name}</strong>
                  <div style={{ margin: '6px 0 3px', fontSize: '0.85em' }}>
                    {occ.toLocaleString()} / {cap.toLocaleString()} occupied ({Math.round(pct)}%)
                  </div>
                  <div style={{ width: 160, height: 8, background: '#e2e8f0', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`,
                      background: pct > 90 ? '#ef4444' : pct > 70 ? '#f59e0b' : '#10b981' }} />
                  </div>
                  <div style={{ fontSize: '0.8em', color: '#64748b', marginTop: 4 }}>
                    {metrics?.remaining > 0 ? `${metrics.remaining.toLocaleString()} capacity remaining` : 'FULL CAPACITY'}
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}

        {/* ── Projected Cyclone Track / Trajectory Path ────────────────────── */}
        <Polyline
          positions={trajectoryLine}
          pathOptions={{
            color: '#ef4444',
            weight: 3,
            dashArray: '8, 8',
            opacity: 0.85,
          }}
        />

        {/* Trajectory Forecast Markers (+6h, +12h, +24h) */}
        {trajectoryPoints.map((tp, idx) => (
          <React.Fragment key={idx}>
            {idx > 0 && (
              <Marker position={[tp.lat, tp.lng]} icon={createTrajectoryIcon(tp.label, idx === 3 ? '#b91c1c' : '#f97316')}>
                <Popup>
                  <div style={{ color: '#1e293b' }}>
                    <strong>🌀 Projected Cyclone Position ({tp.label})</strong><br />
                    Heading: NNW (~340°) | Speed: ~15 km/h<br />
                    Est. Wind: {wind} km/h | Rain: {rain} mm
                  </div>
                </Popup>
              </Marker>
            )}
          </React.Fragment>
        ))}

        {/* Storm impact zones */}
        <>
          <Circle center={[curLat, curLng]}
            radius={rad * 1000}
            pathOptions={{ 
              color: '#ef4444', fillColor: '#ef4444', 
              fillOpacity: 0.02 + intensity * 0.12, 
              dashArray: '10,10', 
              weight: 1.5
            }} 
          />
          <Circle center={[curLat, curLng]}
            radius={rad * 1000 * 0.5}
            pathOptions={{ 
              color: '#ef4444', fillColor: '#ef4444', 
              fillOpacity: 0.05 + intensity * 0.25, 
              dashArray: '5,5', 
              weight: 2
            }}>
            <Popup>
              <strong>🌀 Cyclone Danger Core (Eye Position)</strong><br />
              Radius: {rad} km | Wind: {wind} km/h<br/>
              Heading: NNW (~340°)<br/>
              <em>Click anywhere on map to reposition storm.</em>
            </Popup>
          </Circle>
          <CircleMarker center={[curLat, curLng]}
            radius={5 + intensity * 4} pathOptions={{ color: '#ef4444', fillColor: '#ef4444', fillOpacity: 1, weight: 2 }} />
        </>

        {/* Optimised routes */}
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

      {/* Floating Map Legend */}
      <div className="map-legend">
        <div className="legend-title"><Info size={13} /> Map Legend</div>
        <div className="legend-grid">
          <div className="legend-item"><span className="legend-dot village"></span> Village</div>
          <div className="legend-item"><span className="legend-dot shelter"></span> Shelter</div>
          <div className="legend-item"><span className="legend-dot storm"></span> Cyclone Eye</div>
          <div className="legend-item"><span className="legend-line trajectory"></span> Projected Track</div>
          <div className="legend-item"><span className="legend-line route-safe"></span> Low Risk Route</div>
          <div className="legend-item"><span className="legend-line route-danger"></span> High Risk Route</div>
        </div>
      </div>
    </div>
  );
}
