import React, { useState, useEffect, useRef } from 'react';
import EvacuationMap from './components/EvacuationMap';
import Dashboard from './components/Dashboard';
import LandingPage from './components/LandingPage';
import { Menu, X, AlertTriangle, Home, Play, Pause } from 'lucide-react';

const PRESET_TRACKS = {
  fani: [
    [19.30, 85.30],
    [19.80, 85.80],
    [20.25, 85.83],
    [20.60, 86.40]
  ],
  phailin: [
    [18.80, 85.20],
    [19.30, 84.90],
    [19.70, 84.60],
    [20.10, 84.30]
  ],
  amphan: [
    [19.20, 86.50],
    [19.90, 86.80],
    [20.50, 87.20],
    [21.30, 87.80]
  ]
};

export default function App() {
  const [viewMode, setViewMode] = useState('landing'); // 'landing' | 'app'
  const [region, setRegion] = useState("Puri");
  const [baseData, setBaseData] = useState(null);
  const [threatData, setThreatData] = useState(null);
  const [optimizedData, setOptimizedData] = useState(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [activeAlert, setActiveAlert] = useState(null);
  const [isPanelOpen, setIsPanelOpen] = useState(true);
  const [isSimulatingTrack, setIsSimulatingTrack] = useState(false);
  
  // Custom Path Selection State
  const [trackPreset, setTrackPreset] = useState("fani");
  const [customWaypoints, setCustomWaypoints] = useState(PRESET_TRACKS.fani);
  const [isDrawingPath, setIsDrawingPath] = useState(false);

  const debounceRef = useRef(null);
  const trackAnimRef = useRef(null);
  
  const [stormTrack, setStormTrack] = useState({
    latitude: PRESET_TRACKS.fani[0][0],
    longitude: PRESET_TRACKS.fani[0][1],
    radius_km: 50,
    wind_speed_kmh: 180,
    rainfall_mm: 220,
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

      setOptimizedData(null);
      setActiveAlert(null);
      setIsSimulatingTrack(false);
    } catch (err) {
      console.error("Could not fetch region data", err);
    }
  };

  useEffect(() => {
    if (viewMode === 'app') {
      loadRegionData(region);
    }
  }, [region, viewMode]);

  const handleSelectTrackPreset = (presetKey) => {
    setTrackPreset(presetKey);
    setIsDrawingPath(false);

    if (presetKey in PRESET_TRACKS) {
      const waypoints = PRESET_TRACKS[presetKey];
      setCustomWaypoints(waypoints);
      const newTrack = {
        ...stormTrack,
        latitude: waypoints[0][0],
        longitude: waypoints[0][1]
      };
      setStormTrack(newTrack);
      if (optimizedData) runQuantumOptimization(newTrack, region);
    } else if (presetKey === "nnw") {
      setCustomWaypoints([]);
      const newTrack = {
        ...stormTrack,
        latitude: baseData?.center ? baseData.center[0] : 19.8,
        longitude: baseData?.center ? baseData.center[1] : 85.8
      };
      setStormTrack(newTrack);
      if (optimizedData) runQuantumOptimization(newTrack, region);
    } else if (presetKey === "custom") {
      setIsDrawingPath(true);
    }
  };

  const handleAddWaypoint = (lat, lng) => {
    const updated = [...customWaypoints, [lat, lng]];
    setCustomWaypoints(updated);
    setTrackPreset("custom");

    // Move storm eye to the first waypoint or latest point
    const newTrack = {
      ...stormTrack,
      latitude: updated[0][0],
      longitude: updated[0][1]
    };
    setStormTrack(newTrack);
    if (optimizedData) runQuantumOptimization(newTrack, region);
  };

  const handleClearCustomWaypoints = () => {
    setCustomWaypoints([]);
    setTrackPreset("nnw");
    setIsDrawingPath(false);
  };

  const runQuantumOptimization = async (track = stormTrack, currentRegion = region) => {
    setIsOptimizing(true);
    
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

  // ── Trajectory Simulation Animation Loop ────────────────────────────────
  useEffect(() => {
    if (isSimulatingTrack && viewMode === 'app') {
      let currentIdx = 0;
      const waypoints = (customWaypoints && customWaypoints.length >= 2) 
        ? customWaypoints 
        : [
            [stormTrack.latitude, stormTrack.longitude],
            [stormTrack.latitude + 0.06, stormTrack.longitude - 0.02],
            [stormTrack.latitude + 0.12, stormTrack.longitude - 0.04],
            [stormTrack.latitude + 0.24, stormTrack.longitude - 0.08]
          ];

      trackAnimRef.current = setInterval(() => {
        currentIdx = (currentIdx + 1) % waypoints.length;
        const targetPt = waypoints[currentIdx];
        
        const updatedTrack = {
          ...stormTrack,
          latitude: targetPt[0],
          longitude: targetPt[1]
        };
        setStormTrack(updatedTrack);
        runQuantumOptimization(updatedTrack, region);

        if (currentIdx === waypoints.length - 1) {
          setIsSimulatingTrack(false); // Stop when reaching end of trajectory
        }
      }, 2200);
    } else {
      clearInterval(trackAnimRef.current);
    }

    return () => clearInterval(trackAnimRef.current);
  }, [isSimulatingTrack, viewMode, region, customWaypoints]);

  if (viewMode === 'landing') {
    return <LandingPage onLaunchOptimizer={() => setViewMode('app')} />;
  }

  return (
    <div className="app-container">
      {/* Top Navbar */}
      <header className="app-navbar">
        <div className="nav-brand">
          <button className="nav-back-btn" onClick={() => { setViewMode('landing'); setIsSimulatingTrack(false); }} title="Return to Landing Page">
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
          customWaypoints={customWaypoints}
          isDrawingPath={isDrawingPath}
          onAddWaypoint={handleAddWaypoint}
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
          isSimulatingTrack={isSimulatingTrack}
          onToggleTrackSimulation={() => setIsSimulatingTrack(!isSimulatingTrack)}
          trackPreset={trackPreset}
          onSelectTrackPreset={handleSelectTrackPreset}
          isDrawingPath={isDrawingPath}
          onToggleDrawingPath={() => setIsDrawingPath(!isDrawingPath)}
          customWaypointsCount={customWaypoints.length}
          onClearCustomWaypoints={handleClearCustomWaypoints}
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
              setIsSimulatingTrack(false);
          }}
        />
      </div>
    </div>
  );
}
