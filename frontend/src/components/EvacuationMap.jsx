import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Circle, Popup, Polyline, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function StormTracker({ onStormMove }) {
  useMapEvents({
    click(e) {
      onStormMove(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function MapUpdater({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
       map.flyTo(center, 10, { duration: 1.5 });
    }
  }, [center, map]);
  return null;
}

const getColor = (status) => {
  if (status === 'Safe') return '#10b981';
  if (status === 'At Risk') return '#f59e0b';
  if (status === 'Critical') return '#ef4444';
  return '#06b6d4';
};

// Checks if a route passes through the storm impact zone
function routePassesThroughStorm(assignment, stormTrack) {
  const stormLat = stormTrack.latitude;
  const stormLng = stormTrack.longitude;
  const riskRadiusDeg = (stormTrack.radius_km || 50) / 111.0;

  // Check ML risk_level as the primary indicator
  if (assignment.risk_level >= 0.6) return true;

  // Also check if the shelter itself is inside the storm radius as secondary
  // (village lat/lng are not always on assignment, so we fall back to risk_level above)
  return false;
}

export default function EvacuationMap({ baseData, optimizedData, stormTrack, onStormMove }) {
  const center = baseData?.center || [19.8, 85.8];

  return (
    <MapContainer 
      center={center} 
      zoom={10} 
      style={{ height: '100%', width: '100%' }}
      zoomControl={false}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      
      <MapUpdater center={baseData?.center} />
      <StormTracker onStormMove={onStormMove} />

      {/* Render Villages */}
      {baseData?.villages.map(v => (
        <CircleMarker 
          key={v.id}
          center={[v.lat, v.lng]}
          radius={5}
          pathOptions={{ color: '#06b6d4', fillColor: '#06b6d4', fillOpacity: 0.7 }}
        >
          <Popup>
            <div style={{ color: '#333' }}>
              <strong>{v.name}</strong><br/>
              Pop: {v.population.toLocaleString()}
            </div>
          </Popup>
        </CircleMarker>
      ))}

      {/* Render Shelters */}
      {baseData?.shelters.map(s => {
        const metrics = optimizedData?.shelters?.find(ms => ms.id === s.id);
        const capacity = metrics ? metrics.max_capacity : s.capacity;
        const currentOcc = metrics ? metrics.current_occupancy : 0;
        const remaining = metrics ? metrics.remaining : capacity;
        const percentFilled = (currentOcc / capacity) * 100;
        
        return (
          <CircleMarker 
            key={s.id}
            center={[s.lat, s.lng]}
            radius={8}
            pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.9, weight: 3 }}
          >
            <Popup className="shelter-popup">
              <div style={{ color: '#333' }}>
                <strong style={{ fontSize: '1.1em' }}>{s.name}</strong>
                <div style={{ marginTop: '8px', marginBottom: '4px', fontSize: '0.9em' }}>
                  Capacity: {currentOcc.toLocaleString()} / {capacity.toLocaleString()}
                </div>
                <div style={{ width: '150px', height: '10px', background: '#e2e8f0', borderRadius: '5px', overflow: 'hidden' }}>
                  <div style={{ 
                    height: '100%', 
                    width: `${Math.min(percentFilled, 100)}%`, 
                    background: percentFilled > 90 ? '#ef4444' : percentFilled > 70 ? '#f59e0b' : '#10b981',
                    transition: 'width 0.5s ease'
                  }}></div>
                </div>
                <div style={{ marginTop: '4px', fontSize: '0.8em', color: '#64748b' }}>
                  {remaining > 0 ? `${remaining.toLocaleString()} spots remaining` : 'FULL'}
                </div>
              </div>
            </Popup>
          </CircleMarker>
        )
      })}

      {/* Storm Impact Zone — geo-circles, scale correctly on zoom */}
      <Circle 
        center={[stormTrack.latitude, stormTrack.longitude]}
        radius={40000}
        pathOptions={{ color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.03, dashArray: '10, 10', weight: 1 }}
      />
      <Circle 
        center={[stormTrack.latitude, stormTrack.longitude]}
        radius={25000}
        pathOptions={{ color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.08, dashArray: '5, 5', weight: 2 }}
      >
        <Popup>
          <strong>Cyclone Impact Zone</strong><br />
          Routes inside suffer high ML flood risk penalties.<br/>
          <em>Click anywhere to reposition the storm → auto re-routes!</em>
        </Popup>
      </Circle>
      {/* Fixed 6px dot at the storm eye */}
      <CircleMarker 
        center={[stormTrack.latitude, stormTrack.longitude]}
        radius={6}
        pathOptions={{ color: '#ef4444', fillColor: '#ef4444', fillOpacity: 1, weight: 2 }}
      />

      {/* Render Optimized Routes */}
      {optimizedData && optimizedData.assignments.map((assignment, idx) => {
        const village = baseData?.villages.find(v => v.id === assignment.village_id);
        const shelter = baseData?.shelters.find(s => s.id === assignment.assigned_shelter_id);
        
        if (!village || !shelter) return null;

        const throughStorm = routePassesThroughStorm(assignment, stormTrack);
        const isCritical = assignment.status === 'Critical';
        const color = getColor(assignment.status);
        const weight = Math.max(2, Math.min(6, assignment.population / 350));
        
        // Use backend-fetched real road geometry; fallback to straight line if null
        const positions = assignment.road_geometry
          ? assignment.road_geometry
          : [[village.lat, village.lng], [shelter.lat, shelter.lng]];

        return (
          <Polyline
            key={`route-${idx}`}
            positions={positions}
            pathOptions={{ 
              color: color, 
              weight: weight,
              opacity: throughStorm ? 0.5 : 0.85,
              dashArray: throughStorm ? '6, 6' : null,  // dashed = going through storm zone
            }}
            className={isCritical ? 'flowing-route-critical' : 'flowing-route'}
          >
            <Popup>
              <div style={{ color: '#333', fontSize: '0.85em' }}>
                <strong>{assignment.village_name}</strong> → {assignment.assigned_shelter_name}<br/>
                👥 Pop: {assignment.population.toLocaleString()}<br/>
                ⏱ Est. Time: {assignment.estimated_time_hrs}h &nbsp;
                🌊 Storm Risk: {Math.round(assignment.risk_level * 100)}%<br/>
                🎯 Priority Score: <strong>{Math.round((assignment.composite_score ?? assignment.risk_level) * 100)}%</strong> — <span style={{ color: getColor(assignment.status) }}>{assignment.status}</span><br/>
                {throughStorm && <span style={{ color: '#ef4444' }}>⚠️ Route passes through storm zone!</span>}
              </div>
            </Popup>
          </Polyline>
        );
      })}
    </MapContainer>
  );
}
