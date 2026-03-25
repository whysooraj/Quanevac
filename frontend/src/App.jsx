import React, { useState, useEffect } from 'react';
import EvacuationMap from './components/EvacuationMap';
import Dashboard from './components/Dashboard';

export default function App() {
  const [region, setRegion] = useState("Puri");
  const [baseData, setBaseData] = useState(null);
  const [threatData, setThreatData] = useState(null);
  const [optimizedData, setOptimizedData] = useState(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [activeAlert, setActiveAlert] = useState(null);
  const debounceRef = React.useRef(null);
  
  const [stormTrack, setStormTrack] = useState({
    latitude: 19.8,
    longitude: 85.8,
    radius_km: 50,
    wind_speed_kmh: 150,
    rainfall_mm: 200,
  });

  const loadRegionData = async (targetRegion) => {
    try {
      const dataRes = await fetch(`http://localhost:8000/api/data/${targetRegion}`);
      const data = await dataRes.json();
      setBaseData(data);
      
      const threatRes = await fetch(`http://localhost:8000/api/threat/${targetRegion}`);
      const threat = await threatRes.json();
      setThreatData(threat);

      // set generic storm track near center of region
      setStormTrack(prev => ({
         ...prev,
         latitude: data.center[0],
         longitude: data.center[1],
         radius_km: 50,
      }));
      
      // Reset optimizations on region change
      setOptimizedData(null);
      setActiveAlert(null);
    } catch (err) {
      console.error("Could not fetch region data", err);
    }
  };

  useEffect(() => {
    loadRegionData(region);
  }, [region]);

  const runQuantumOptimization = async (track = stormTrack, currentRegion = region) => {
    setIsOptimizing(true);
    setOptimizedData(null);
    
    try {
      const response = await fetch('http://localhost:8000/api/optimize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...track, region: currentRegion })
      });
      
      const result = await response.json();
      setOptimizedData(result);
    } catch (err) {
      console.error("Optimization failed:", err);
    } finally {
      setIsOptimizing(false);
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      fetch('http://localhost:8000/api/alerts')
        .then(res => res.json())
        .then(data => {
          if (data.active && data.storm && !activeAlert) {
             // For the demo, we assume the simulated alert is relevant for the current region
            setActiveAlert(data.storm);
            setStormTrack({
              latitude: data.storm.latitude,
              longitude: data.storm.longitude,
              radius_km: data.storm.radius_km
            });
            runQuantumOptimization(data.storm, region);
          }
        })
        .catch(e => console.error("Polling error", e));
    }, 5000);

    return () => clearInterval(interval);
  }, [activeAlert, region]);

  return (
    <div className="app-container">
      {activeAlert && (
         <div className="alert-banner">
            ALARM: {activeAlert.name} Detected! Auto-Routing Evacuation Paths...
         </div>
      )}
      <div className="map-container">
      <EvacuationMap 
          baseData={baseData} 
          optimizedData={optimizedData}
          stormTrack={stormTrack}
          onStormMove={(lat, lng) => {
            const newTrack = { ...stormTrack, latitude: lat, longitude: lng };
            setStormTrack(newTrack);
            if (optimizedData) {
              clearTimeout(debounceRef.current);
              debounceRef.current = setTimeout(() => {
                runQuantumOptimization(newTrack, region);
              }, 800);
            }
          }}
        />
      </div>
      <Dashboard 
        region={region}
        setRegion={setRegion}
        threatData={threatData}
        isOptimizing={isOptimizing}
        optimizedData={optimizedData}
        stormTrack={stormTrack}
        onStormParamChange={(key, val) => {
          const newTrack = { ...stormTrack, [key]: val };
          setStormTrack(newTrack);
          // Debounce reoptimize when sliders change if routes are already visible
          if (optimizedData) {
            clearTimeout(debounceRef.current);
            debounceRef.current = setTimeout(() => {
              runQuantumOptimization(newTrack, region);
            }, 1500);
          }
        }}
        onRunOptimization={() => runQuantumOptimization(stormTrack, region)}
        resetAlert={() => {
            fetch('http://localhost:8000/api/alerts/reset', { method: 'POST' });
            setActiveAlert(null);
            setOptimizedData(null);
        }}
      />
    </div>
  );
}
