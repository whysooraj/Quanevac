import React from 'react';
import { Activity, ShieldAlert, Navigation, Clock, Users, Database, MapPin } from 'lucide-react';

export default function Dashboard({ region, setRegion, threatData, isOptimizing, optimizedData, stormTrack, onStormParamChange, onRunOptimization, resetAlert }) {

  const windCategory = (w) => w >= 220 ? ['Cat 5', '#ef4444'] : w >= 178 ? ['Cat 4', '#f97316'] : w >= 130 ? ['Cat 3', '#f59e0b'] : w >= 83 ? ['Cat 2', '#eab308'] : ['Cat 1', '#10b981'];
  const rainCategory  = (r) => r >= 300 ? ['Extreme', '#ef4444'] : r >= 200 ? ['Heavy', '#f97316'] : r >= 100 ? ['Moderate', '#f59e0b'] : ['Light', '#10b981'];

  const SliderRow = ({ label, param, min, max, step, value, fmt }) => (
    <div style={{ marginBottom: '10px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '0.78rem' }}>
        <span style={{ color: '#94a3b8' }}>{label}</span>
        <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{fmt(value)}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onStormParamChange(param, parseFloat(e.target.value))}
        style={{ width: '100%', accentColor: 'var(--accent-cyan)', cursor: 'pointer' }}
      />
    </div>
  );
  
  return (
    <div className="dashboard-panel">
      <div className="narrative-box">
        <strong>The Fani 2019 Problem:</strong> 1.2M evacuated. 28 deaths. A success, but the 48-hour evacuation dangerously consumed the 72-hour warning window. 
        <br/><br/>
        <em>Our solution: Hybrid ML + QAOA real-time route optimization to widen the margin of life.</em>
      </div>
      <div className="header" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'}}>
        <div>
          <h1>Quantum Evac</h1>
          <p>Resource Allocation & Routing Engine</p>
        </div>
        
        {/* Region Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <MapPin size={16} color="var(--accent-cyan)" />
          <select 
            value={region} 
            onChange={(e) => setRegion(e.target.value)}
            style={{
              background: 'rgba(0,0,0,0.3)',
              color: 'white',
              border: '1px solid var(--border-light)',
              borderRadius: '6px',
              padding: '6px 12px',
              outline: 'none',
              fontFamily: 'Inter',
              cursor: 'pointer'
            }}
          >
            <option value="Puri">Puri District</option>
            <option value="Kendrapara">Kendrapara District</option>
            <option value="Ganjam">Ganjam District</option>
            <option value="Jagatsinghpur">Jagatsinghpur</option>
          </select>
        </div>
      </div>

      {/* Threat Level Box */}
      {threatData && (
        <div className={`threat-box ${threatData.level.toLowerCase()}`} style={{
            padding: '12px',
            borderRadius: '8px',
            marginBottom: '20px',
            borderLeft: '4px solid',
            borderColor: threatData.level === 'HIGH' ? 'var(--status-critical)' : threatData.level === 'MODERATE' ? 'var(--status-risk)' : 'var(--status-safe)',
            background: threatData.level === 'HIGH' ? 'rgba(239, 68, 68, 0.1)' : threatData.level === 'MODERATE' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(16, 185, 129, 0.1)'
        }}>
          <div style={{ 
            fontWeight: 'bold', 
            fontSize: '0.85rem', 
            marginBottom: '4px',
            color: threatData.level === 'HIGH' ? 'var(--status-critical)' : threatData.level === 'MODERATE' ? 'var(--status-risk)' : 'var(--status-safe)'
          }}>
            THREAT LEVEL: {threatData.level}
          </div>
          <div style={{ fontSize: '0.85rem', color: '#e2e8f0', lineHeight: 1.4 }}>
            {threatData.message}
          </div>
        </div>
      )}

      {/* ── Storm Parameters ─────────────────────────────────────── */}
      <div style={{
        background: 'rgba(0,0,0,0.25)',
        borderRadius: '10px',
        border: '1px solid rgba(255,255,255,0.08)',
        padding: '14px 16px',
        marginBottom: '16px',
      }}>
        <div style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.08em', color: 'var(--accent-cyan)', marginBottom: '12px' }}>
          ⚡ STORM PARAMETERS
        </div>

        <SliderRow label={`Storm Radius (km)`}   param="radius_km"       min={20}  max={150} step={5}  value={stormTrack?.radius_km ?? 50}       fmt={v => `${v} km`} />

        <SliderRow label={`Wind Speed`}           param="wind_speed_kmh"  min={50}  max={220} step={5}  value={stormTrack?.wind_speed_kmh ?? 150}
          fmt={v => { const [cat, col] = windCategory(v); return <><span style={{color: col}}>{cat}</span> · {v} km/h</>; }} />

        <SliderRow label={`Rainfall Intensity`}   param="rainfall_mm"     min={50}  max={400} step={10} value={stormTrack?.rainfall_mm ?? 200}
          fmt={v => { const [cat, col] = rainCategory(v); return <><span style={{color: col}}>{cat}</span> · {v} mm</>; }} />

        <div style={{ fontSize: '0.68rem', color: '#475569', marginTop: '6px' }}>
          Slide to change storm intensity → hit Optimize to re-run LSTM+QAOA pipeline
        </div>
      </div>

      <button 
        className={`btn-quantum ${optimizedData ? 'btn-reset' : ''}`}
        onClick={optimizedData ? resetAlert : onRunOptimization}
        disabled={isOptimizing}
      >
        {isOptimizing ? (
          <>
            <Activity className="animate-pulse" size={18} />
            Running ML & QAOA Pipeline...
          </>
        ) : optimizedData ? (
          <>
            <Navigation size={18} />
            Reset Simulation
          </>
        ) : (
          <>
            <Navigation size={18} />
            Optimize {region} Route Plans
          </>
        )}
      </button>

      {optimizedData && (
        <>
          {/* ── Quick stats ──────────────────────────────────────── */}
          <div className="metrics-grid">
            <div className="metric-card">
              <div className="metric-title" style={{color: '#a855f7'}}>ML Pipeline</div>
              <div className="metric-value">{optimizedData.ml_execution_time_ms} ms</div>
            </div>
            <div className="metric-card">
              <div className="metric-title" style={{color: '#3b82f6'}}>QAOA Circuit</div>
              <div className="metric-value">{optimizedData.quantum_execution_time_ms} ms</div>
            </div>
            <div className="metric-card">
              <div className="metric-title">People Secured</div>
              <div className="metric-value" style={{ color: '#06b6d4' }}>
                <Users size={16} style={{display: 'inline', marginRight: '4px'}}/>
                {optimizedData.metrics.people_secured.toLocaleString()}
              </div>
            </div>
            <div className="metric-card" style={{ gridColumn: 'span 2', background: 'rgba(16, 185, 129, 0.1)', borderColor: 'rgba(16, 185, 129, 0.3)' }}>
              <div className="metric-title" style={{ color: '#10b981' }}>Overall QAOA Advantage (weighted)</div>
              <div className="metric-value metric-highlight">
                <Clock size={20} style={{display: 'inline', marginRight: '8px', verticalAlign: 'middle'}}/>
                {optimizedData.metrics.time_reduction_percentage}%
              </div>
              <div style={{fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px'}}>
                20% time + 35% load balance + 30% risk exposure + 15% high-risk routes
              </div>
            </div>
          </div>

          {/* ── Genuine QAOA vs Classical comparison ─────────────── */}
          {optimizedData.comparison && (
            <div style={{
              background: 'rgba(0,0,0,0.25)',
              border: '1px solid rgba(99,102,241,0.3)',
              borderRadius: '10px',
              padding: '14px',
              marginBottom: '18px',
            }}>
              <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#818cf8', marginBottom: '10px', letterSpacing: '0.05em' }}>
                ⚛️ QAOA vs Classical Greedy — Measured Metrics
              </div>
              <table style={{ width: '100%', fontSize: '0.78rem', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ color: '#64748b', textAlign: 'left' }}>
                    <th style={{ paddingBottom: '6px' }}>Metric</th>
                    <th style={{ paddingBottom: '6px', color: '#ef4444' }}>Classical</th>
                    <th style={{ paddingBottom: '6px', color: '#10b981' }}>QAOA Hybrid</th>
                    <th style={{ paddingBottom: '6px', color: '#a855f7' }}>Improvement</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    {
                      label: 'Avg Clearance Time',
                      cVal: `${optimizedData.comparison.classical.avg_clearance_hrs} hrs`,
                      qVal: `${optimizedData.comparison.quantum.avg_clearance_hrs} hrs`,
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
                    <tr key={i} style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '5px 0', color: '#94a3b8' }}>{row.label}</td>
                      <td style={{ padding: '5px 4px', color: '#fca5a5' }}>{row.cVal}</td>
                      <td style={{ padding: '5px 4px', color: '#86efac' }}>{row.qVal}</td>
                      <td style={{ padding: '5px 4px', color: row.val > 0 ? '#10b981' : '#f59e0b', fontWeight: 700 }}>
                        {row.val > 0 ? `↓ ${row.val}%` : row.val < 0 ? `↑ ${Math.abs(row.val)}%` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ fontSize: '0.7rem', color: '#475569', marginTop: '8px' }}>
                Load Balance σ%: lower = more evenly distributed shelters. Risk Exposure: Σ(risk × population).
              </div>
            </div>
          )}

          <div className="shelter-capacity-section">
            <h3><Database size={16} style={{display:'inline', marginRight:'6px', verticalAlign:'sub'}}/>Shelter Capacity Status</h3>
            {optimizedData.shelters.map((s, i) => {
              const percent = (s.current_occupancy / s.max_capacity) * 100;
              const fillClass = percent > 90 ? 'critical' : percent > 70 ? 'risk' : 'safe';
              return (
                <div className="shelter-bar-container" key={i}>
                  <div className="shelter-bar-header">
                    <span>{s.name}</span>
                    <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                      {s.current_occupancy.toLocaleString()} / {s.max_capacity.toLocaleString()}
                    </span>
                  </div>
                  <div className="progress-bar-bg">
                    <div 
                      className={`progress-bar-fill ${fillClass}`} 
                      style={{ width: `${Math.min(percent, 100)}%` }}
                    ></div>
                  </div>
                  <div className="shelter-bar-footer">
                    {s.remaining > 0 ? `${s.remaining.toLocaleString()} spots remaining` : 'FULL'}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="priority-list">
            <h3>Evacuation Priority Sequence ({region})</h3>
            {optimizedData.assignments.slice(0, 5).map((assignment, i) => (
              <div className="route-item" key={i}>
                <div className="route-header">
                  <span className="route-name">{assignment.village_name}</span>
                  <span className={`badge ${assignment.status.toLowerCase().replace(' ', '-')}`}>
                    {assignment.status}
                  </span>
                </div>
                <div className="route-details">
                  <span>Target: {assignment.assigned_shelter_name}</span>
                  <span><strong>{assignment.estimated_time_hrs} hrs</strong></span>
                </div>
              </div>
            ))}
            {optimizedData.assignments.length > 5 && (
               <div style={{textAlign: 'center', fontSize: '0.8rem', color: '#64748b', marginTop: '8px'}}>
                 ... and {optimizedData.assignments.length - 5} more villages routed.
               </div>
            )}
          </div>
        </>
      )}

      {!optimizedData && !isOptimizing && (
        <div style={{ textAlign: 'center', margin: 'auto',  marginTop: '40px', color: '#94a3b8', fontSize: '0.9rem' }}>
          <ShieldAlert size={32} opacity={0.5} style={{ marginBottom: '12px' }} />
          <p>Click anywhere on the map to place the storm core,<br/>then hit Optimize.</p>
        </div>
      )}
    </div>
  );
}
