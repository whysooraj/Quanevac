import React, { useState } from 'react';
import { Activity, ShieldAlert, Navigation, Clock, Users, Database, MapPin, Sliders, BarChart2, Shield, Layers, Play, Pause, Compass } from 'lucide-react';

export default function Dashboard({ 
  region, 
  setRegion, 
  threatData, 
  isOptimizing, 
  optimizedData, 
  stormTrack, 
  onStormParamChange, 
  onRunOptimization, 
  resetAlert,
  isSimulatingTrack,
  onToggleTrackSimulation
}) {
  const [activeTab, setActiveTab] = useState('config'); // 'config' | 'metrics' | 'shelters'

  const windCategory = (w) => w >= 220 ? ['Cat 5', '#ef4444'] : w >= 178 ? ['Cat 4', '#f97316'] : w >= 130 ? ['Cat 3', '#f59e0b'] : w >= 83 ? ['Cat 2', '#eab308'] : ['Cat 1', '#10b981'];
  const rainCategory  = (r) => r >= 300 ? ['Extreme', '#ef4444'] : r >= 200 ? ['Heavy', '#f97316'] : r >= 100 ? ['Moderate', '#f59e0b'] : ['Light', '#10b981'];

  const SliderRow = ({ label, param, min, max, step, value, fmt }) => (
    <div className="slider-row">
      <div className="slider-header">
        <span className="slider-label">{label}</span>
        <span className="slider-val">{fmt(value)}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onStormParamChange(param, parseFloat(e.target.value))}
        className="custom-range-slider"
      />
    </div>
  );
  
  return (
    <div className="dashboard-panel">
      {/* Header section */}
      <div className="dashboard-header">
        <div>
          <h1>Quantum Evac</h1>
          <p className="subtitle">Quantum Disaster Optimization Engine</p>
        </div>
        
        {/* Region Selector */}
        <div className="region-selector-wrapper">
          <MapPin size={15} color="var(--accent-cyan)" />
          <select 
            value={region} 
            onChange={(e) => setRegion(e.target.value)}
            className="region-select"
          >
            <option value="Puri">Puri District</option>
            <option value="Kendrapara">Kendrapara District</option>
            <option value="Ganjam">Ganjam District</option>
            <option value="Jagatsinghpur">Jagatsinghpur</option>
          </select>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="tab-nav">
        <button 
          className={`tab-btn ${activeTab === 'config' ? 'active' : ''}`}
          onClick={() => setActiveTab('config')}
        >
          <Sliders size={15} /> Storm Config
        </button>
        <button 
          className={`tab-btn ${activeTab === 'metrics' ? 'active' : ''}`}
          onClick={() => setActiveTab('metrics')}
        >
          <BarChart2 size={15} /> Metrics {optimizedData && <span className="tab-badge">QAOA</span>}
        </button>
        <button 
          className={`tab-btn ${activeTab === 'shelters' ? 'active' : ''}`}
          onClick={() => setActiveTab('shelters')}
        >
          <Layers size={15} /> Shelters {optimizedData && <span className="tab-badge">{optimizedData.shelters.length}</span>}
        </button>
      </div>

      {/* Main Action Buttons */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
        <button 
          className={`btn-quantum ${optimizedData ? 'btn-reset' : ''}`}
          onClick={optimizedData ? resetAlert : onRunOptimization}
          disabled={isOptimizing}
          style={{ flex: 1, marginBottom: 0 }}
        >
          {isOptimizing ? (
            <>
              <Activity className="animate-pulse" size={18} />
              Running ML & QAOA...
            </>
          ) : optimizedData ? (
            <>
              <Navigation size={18} />
              Reset Simulation
            </>
          ) : (
            <>
              <Navigation size={18} />
              Optimize Routes
            </>
          )}
        </button>

        <button 
          className={`btn-track-sim ${isSimulatingTrack ? 'active' : ''}`}
          onClick={onToggleTrackSimulation}
          title={isSimulatingTrack ? "Pause Track Simulation" : "Animate Cyclone Trajectory Movement"}
          style={{
            background: isSimulatingTrack ? 'rgba(239, 68, 68, 0.2)' : 'rgba(6, 182, 212, 0.15)',
            border: `1px solid ${isSimulatingTrack ? '#ef4444' : 'var(--accent-cyan)'}`,
            color: isSimulatingTrack ? '#ef4444' : 'var(--accent-cyan)',
            borderRadius: 'var(--pill-radius)',
            padding: '0 16px',
            fontWeight: 700,
            fontSize: '0.82rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.2s ease',
            whiteSpace: 'nowrap'
          }}
        >
          {isSimulatingTrack ? <Pause size={16} /> : <Play size={16} />}
          {isSimulatingTrack ? 'Pause Track' : 'Animate Track'}
        </button>
      </div>

      {/* Tab 1: Config & Overview */}
      {activeTab === 'config' && (
        <div className="tab-content">
          <div className="narrative-box">
            <strong>Projected Cyclone Track:</strong> Moves NNW (~340°) across Bay of Bengal toward landfall. Trajectory markers show estimated position at +6h, +12h, and +24h.
          </div>

          {/* Threat Level Box */}
          {threatData && (
            <div className={`threat-box ${threatData.level.toLowerCase()}`}>
              <div className="threat-title">
                <ShieldAlert size={16} /> THREAT LEVEL: {threatData.level}
              </div>
              <div className="threat-msg">
                {threatData.message}
              </div>
            </div>
          )}

          {/* Storm Parameters */}
          <div className="config-card">
            <div className="card-title">
              ⚡ DYNAMIC STORM PARAMETERS & TRAJECTORY
            </div>

            <SliderRow label="Storm Radius (km)" param="radius_km" min={20} max={150} step={5} value={stormTrack?.radius_km ?? 50} fmt={v => `${v} km`} />

            <SliderRow label="Wind Speed" param="wind_speed_kmh" min={50} max={220} step={5} value={stormTrack?.wind_speed_kmh ?? 150}
              fmt={v => { const [cat, col] = windCategory(v); return <><span style={{color: col, fontWeight: 700}}>{cat}</span> · {v} km/h</>; }} />

            <SliderRow label="Rainfall Intensity" param="rainfall_mm" min={50} max={400} step={10} value={stormTrack?.rainfall_mm ?? 200}
              fmt={v => { const [cat, col] = rainCategory(v); return <><span style={{color: col, fontWeight: 700}}>{cat}</span> · {v} mm</>; }} />

            <div className="helper-text">
              💡 Click <strong>"Animate Track"</strong> to simulate live storm progression along its projected trajectory path!
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Quantum Metrics & Insights */}
      {activeTab === 'metrics' && (
        <div className="tab-content">
          {!optimizedData ? (
            <div className="empty-tab-state">
              <BarChart2 size={36} opacity={0.4} />
              <p>Run optimization to view QAOA circuit timing, ML latency, and performance improvements.</p>
            </div>
          ) : (
            <>
              {/* Quick stats */}
              <div className="metrics-grid">
                <div className="metric-card">
                  <div className="metric-title" style={{color: '#a855f7'}}>PyTorch LSTM</div>
                  <div className="metric-value">{optimizedData.ml_execution_time_ms} ms</div>
                </div>
                <div className="metric-card">
                  <div className="metric-title" style={{color: '#6366f1'}}>Qiskit QAOA</div>
                  <div className="metric-value">{optimizedData.quantum_execution_time_ms} ms</div>
                </div>
                <div className="metric-card">
                  <div className="metric-title">Secured Pop.</div>
                  <div className="metric-value" style={{ color: '#06b6d4' }}>
                    <Users size={16} style={{display: 'inline', marginRight: '4px'}}/>
                    {optimizedData.metrics.people_secured.toLocaleString()}
                  </div>
                </div>
                <div className="metric-card highlight-card">
                  <div className="metric-title" style={{ color: '#10b981' }}>QAOA Weighted Advantage</div>
                  <div className="metric-value metric-highlight">
                    <Clock size={20} style={{display: 'inline', marginRight: '6px', verticalAlign: 'middle'}}/>
                    +{optimizedData.metrics.time_reduction_percentage}%
                  </div>
                </div>
              </div>

              {/* QAOA vs Classical comparison table */}
              {optimizedData.comparison && (
                <div className="comparison-card">
                  <div className="card-title purple">
                    ⚛️ QAOA vs Classical Greedy Solver
                  </div>
                  <table className="comparison-table">
                    <thead>
                      <tr>
                        <th>Metric</th>
                        <th style={{ color: '#ef4444' }}>Classical</th>
                        <th style={{ color: '#10b981' }}>QAOA Hybrid</th>
                        <th style={{ color: '#a855f7' }}>Advantage</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        {
                          label: 'Clearance Time',
                          cVal: `${optimizedData.comparison.classical.avg_clearance_hrs}h`,
                          qVal: `${optimizedData.comparison.quantum.avg_clearance_hrs}h`,
                          val: optimizedData.comparison.improvements.clearance_time_reduction_pct,
                        },
                        {
                          label: 'Load Balance (σ%)',
                          cVal: `${optimizedData.comparison.classical.load_balance_std_pct}%`,
                          qVal: `${optimizedData.comparison.quantum.load_balance_std_pct}%`,
                          val: optimizedData.comparison.improvements.load_balance_improvement_pct,
                        },
                        {
                          label: 'Risk Exposure',
                          cVal: optimizedData.comparison.classical.total_risk_exposure.toLocaleString(),
                          qVal: optimizedData.comparison.quantum.total_risk_exposure.toLocaleString(),
                          val: optimizedData.comparison.improvements.risk_exposure_reduction_pct,
                        },
                        {
                          label: 'High-Risk Routes',
                          cVal: `${optimizedData.comparison.classical.high_risk_routes_pct}%`,
                          qVal: `${optimizedData.comparison.quantum.high_risk_routes_pct}%`,
                          val: optimizedData.comparison.improvements.high_risk_routes_reduced_pct,
                        },
                      ].map((row, i) => (
                        <tr key={i}>
                          <td className="row-label">{row.label}</td>
                          <td className="row-cval">{row.cVal}</td>
                          <td className="row-qval">{row.qVal}</td>
                          <td className="row-imp">
                            {row.val > 0 ? `↓ ${row.val}%` : row.val < 0 ? `↑ ${Math.abs(row.val)}%` : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Tab 3: Shelters & Priority Sequence */}
      {activeTab === 'shelters' && (
        <div className="tab-content">
          {!optimizedData ? (
            <div className="empty-tab-state">
              <Layers size={36} opacity={0.4} />
              <p>Run optimization to view real-time shelter occupancy and village evacuation priority sequences.</p>
            </div>
          ) : (
            <>
              <div className="shelter-capacity-section">
                <h3><Database size={15} style={{display:'inline', marginRight:'6px', verticalAlign:'sub'}}/> Shelter Capacity Occupancy</h3>
                {optimizedData.shelters.map((s, i) => {
                  const percent = (s.current_occupancy / s.max_capacity) * 100;
                  const fillClass = percent > 90 ? 'critical' : percent > 70 ? 'risk' : 'safe';
                  return (
                    <div className="shelter-bar-container" key={i}>
                      <div className="shelter-bar-header">
                        <span className="shelter-name">{s.name}</span>
                        <span className="shelter-counts">
                          {s.current_occupancy.toLocaleString()} / {s.max_capacity.toLocaleString()}
                        </span>
                      </div>
                      <div className="progress-bar-bg">
                        <div 
                          className={`progress-bar-fill ${fillClass}`} 
                          style={{ width: `${Math.min(percent, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="priority-list">
                <h3>Evacuation Route Priority ({region})</h3>
                {optimizedData.assignments.slice(0, 6).map((assignment, i) => (
                  <div className="route-item" key={i}>
                    <div className="route-header">
                      <span className="route-name">{assignment.village_name}</span>
                      <span className={`badge ${assignment.status.toLowerCase().replace(' ', '-')}`}>
                        {assignment.status}
                      </span>
                    </div>
                    <div className="route-details">
                      <span>Dest: <strong>{assignment.assigned_shelter_name}</strong></span>
                      <span>⏱ <strong>{assignment.estimated_time_hrs} hrs</strong></span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
