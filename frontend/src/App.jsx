import React, { useState, useEffect, useRef } from 'react';
import EvacuationMap from './components/EvacuationMap';
import Dashboard from './components/Dashboard';
import LandingPage from './components/LandingPage';
import { Menu, X, AlertTriangle, ArrowLeft, Home } from 'lucide-react';

export default function App() {
  const [viewMode, setViewMode] = useState('landing'); // 'landing' | 'app'
  const [region, setRegion] = useState("Puri");
  const [baseData, setBaseData] = useState(null);
  const [threatData, setThreatData] = useState(null);
  const [optimizedData, setOptimizedData] = useState(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [activeAlert, setActiveAlert] = useState(null);
  const [isPanelOpen, setIsPanelOpen] = useState(true);
  const debounceRef = useRef(null);
  
  const [stormTrack, setStormTrack] = useState({
    latitude: 19.8,
    longitude: 85.8,
    radius_km: 50,
    wind_speed_kmh: 150,
    rainfall_mm: 200,
    provider: "aer",
  });

  const loadRegionData = async (targetRegion) => {
    try {
      const dataRes = await fetch(`http://localhost:8000/api/data/${targetRegion}`);
      const data = await dataRes.json();
      setBaseData(data);
      
      const threatRes = await fetch(`http://localhost:8000/api/threat/${targetRegion}`);
      const threat = await threatRes.json();
      setThreatData(threat);

      setStormTrack(prev => ({
         ...prev,
         latitude: data.center[0],
         longitude: data.center[1],
         radius_km: 50,
      }));
      
      setOptimizedData(null);
      setActiveAlert(null);
    } catch (err) {
      console.error("Could not fetch region data", err);
    }
  };

  useEffect(() => {
    if (viewMode === 'app') {
      loadRegionData(region);
    }
  }, [region, viewMode]);

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
    if (viewMode !== 'app') return;

    const interval = setInterval(() => {
      fetch('http://localhost:8000/api/alerts')
        .then(res => res.json())
        .then(data => {
          if (data.active && data.storm && !activeAlert) {
            setActiveAlert(data.storm);
            setStormTrack(prev => ({
              ...prev,
              latitude: data.storm.latitude,
              longitude: data.storm.longitude,
              radius_km: data.storm.radius_km,
              wind_speed_kmh: 180,
              rainfall_mm: 250,
            }));
            runQuantumOptimization(data.storm, region);
          }
        })
        .catch(e => console.error("Polling error", e));
    }, 5000);

    return () => clearInterval(interval);
  }, [activeAlert, region, viewMode]);

  if (viewMode === 'landing') {
    return <LandingPage onLaunchOptimizer={() => setViewMode('app')} />;
  }

  return (
    <div className="app-container">
      {/* Top Navbar */}
      <header className="app-navbar">
        <div className="nav-brand">
          <button className="nav-back-btn" onClick={() => setViewMode('landing')} title="Return to Landing Page">
            <Home size={15} /> Landing
          </button>
          <span className="brand-badge">QUANEVAC</span>
          <span className="brand-title">Odisha Quantum Disaster Optimizer</span>
        </div>
        <div className="nav-actions">
          {activeAlert && (
            <div className="nav-alert-chip">
              <AlertTriangle size={14} /> {activeAlert.name} Detected
            </div>
          )}
          <button 
            className="toggle-panel-btn"
            onClick={() => setIsPanelOpen(!isPanelOpen)}
            title={isPanelOpen ? "Collapse Panel" : "Expand Panel"}
          >
            {isPanelOpen ? <X size={18} /> : <Menu size={18} />}
            <span className="toggle-label">{isPanelOpen ? "Hide Panel" : "Control Panel"}</span>
          </button>
        </div>
      </header>

      {/* Main Map Viewport */}
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

      {/* Collapsible Dashboard Side Drawer */}
      <div className={`dashboard-wrapper ${isPanelOpen ? 'open' : 'closed'}`}>
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
            if (optimizedData) {
              clearTimeout(debounceRef.current);
              debounceRef.current = setTimeout(() => {
                runQuantumOptimization(newTrack, region);
              }, 1200);
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
    </div>
  );
}
