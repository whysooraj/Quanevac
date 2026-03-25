import React from 'react';
import { Activity, ShieldAlert, Navigation, Clock, Users, Database, MapPin } from 'lucide-react';

export default function Dashboard({ region, setRegion, threatData, isOptimizing, optimizedData, onRunOptimization, resetAlert }) {
  
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
          <div className="metrics-grid">
            <div className="metric-card">
              <div className="metric-title" style={{color: '#a855f7'}}>ML Pipeline Time</div>
              <div className="metric-value">{optimizedData.ml_execution_time_ms} ms</div>
            </div>
            <div className="metric-card">
              <div className="metric-title" style={{color: '#3b82f6'}}>QAOA Circuit Time</div>
              <div className="metric-value">{optimizedData.quantum_execution_time_ms} ms</div>
            </div>
            <div className="metric-card">
              <div className="metric-title">Secured Targets</div>
              <div className="metric-value" style={{ color: '#06b6d4' }}>
                <Users size={16} style={{display: 'inline', marginRight: '4px'}}/>
                {optimizedData.metrics.people_secured.toLocaleString()}
              </div>
            </div>
            <div className="metric-card" style={{ gridColumn: 'span 2', background: 'rgba(16, 185, 129, 0.1)', borderColor: 'rgba(16, 185, 129, 0.3)' }}>
              <div className="metric-title" style={{ color: '#10b981' }}>Est. Clearance Time Reduction</div>
              <div className="metric-value metric-highlight">
                <Clock size={20} style={{display: 'inline', marginRight: '8px', verticalAlign: 'middle'}}/>
                {optimizedData.metrics.time_reduction_percentage}%
              </div>
              <div style={{fontSize: '0.8rem', color: '#94a3b8', marginTop: '4px'}}>
                Quantum {optimizedData.metrics.qaoa_optimized_clearance_hrs} hrs vs Classical {optimizedData.metrics.unoptimized_clearance_hrs} hrs
              </div>
            </div>
          </div>

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
