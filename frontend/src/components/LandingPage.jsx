import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import gsap from 'gsap';
import { 
  Zap, 
  ShieldCheck, 
  Cpu, 
  MapPin, 
  ArrowRight, 
  Activity, 
  Clock, 
  Layers, 
  Compass, 
  Sparkles,
  ChevronRight,
  Database
} from 'lucide-react';

export default function LandingPage({ onLaunchOptimizer }) {
  const heroRef = useRef(null);

  useEffect(() => {
    if (heroRef.current) {
      gsap.fromTo(
        heroRef.current,
        { opacity: 0, y: 24 },
        { opacity: 1, y: 0, duration: 1.0, ease: 'power3.out' }
      );
    }
  }, []);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.12, delayChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 16 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } }
  };

  return (
    <div className="warmwind-landing">
      {/* Navbar Header */}
      <nav className="warmwind-nav">
        <div className="nav-container">
          <div className="brand-pill">
            <span className="brand-dot"></span>
            <span className="brand-name">quanevac</span>
            <span className="brand-tag">v2.0</span>
          </div>

          <div className="nav-center-pills">
            <a href="#how-it-works" className="nav-pill-link">Architecture</a>
            <a href="#capabilities" className="nav-pill-link">Capabilities</a>
            <a href="#benchmark" className="nav-pill-link">Quantum Advantage</a>
          </div>

          <button className="warmwind-btn-primary" onClick={onLaunchOptimizer}>
            Launch Engine <ChevronRight size={16} />
          </button>
        </div>
      </nav>

      {/* Main Hero Container */}
      <main className="warmwind-hero-wrapper" ref={heroRef}>
        <div className="hero-carbon-card">
          <motion.div 
            className="warmwind-badge-pill"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <span className="icon-blob-mini"><Sparkles size={12} /></span>
            Hybrid PyTorch LSTM + Qiskit QAOA Optimization
          </motion.div>

          <h1 className="warmwind-hero-title">
            Autonomous Quantum Routing <br />
            <span className="text-highlight">for Disaster Evacuation</span>
          </h1>

          <p className="warmwind-hero-sub">
            Built for coastal cyclone emergencies, Quanevac optimizes village-to-shelter matching in under 1 second by fusing quantum approximate optimization (QAOA) with physics-informed LSTM flood risk neural networks.
          </p>

          <div className="warmwind-hero-actions">
            <button className="warmwind-btn-cta" onClick={onLaunchOptimizer}>
              Explore Live Engine <ArrowRight size={16} />
            </button>
            <a href="#how-it-works" className="warmwind-btn-ghost">
              System Blueprint
            </a>
          </div>

          {/* Warmwind-style Stats Strip */}
          <div className="warmwind-stats-grid">
            <div className="stats-item">
              <div className="stat-value">&lt; 230ms</div>
              <div className="stat-caption">QAOA Circuit Latency</div>
            </div>
            <div className="stats-item">
              <div className="stat-value">35.4%</div>
              <div className="stat-caption">Shelter Load Variance Improvement</div>
            </div>
            <div className="stats-item">
              <div className="stat-value">3 Providers</div>
              <div className="stat-caption">Aer, IBM Quantum QPU & Classical</div>
            </div>
            <div className="stats-item">
              <div className="stat-value">100%</div>
              <div className="stat-caption">OSRM Road Polylines</div>
            </div>
          </div>
        </div>
      </main>

      {/* System Architecture / How It Works */}
      <section id="how-it-works" className="warmwind-section">
        <div className="warmwind-container">
          <div className="section-pill-tag">
            <Compass size={14} /> PIPELINE ARCHITECTURE
          </div>
          <h2 className="section-title">How Quanevac Works</h2>
          <p className="section-sub">A 4-step autonomous loop connecting dynamic storm inputs, neural networks, and quantum optimization.</p>

          <motion.div 
            className="steps-grid"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-40px' }}
          >
            <motion.div className="step-card" variants={itemVariants}>
              <div className="card-badge-num">01</div>
              <div className="icon-blob cyan">
                <Compass size={22} color="#06b6d4" />
              </div>
              <h3>Storm Telemetry Ingestion</h3>
              <p>Monitors cyclone tracks (latitude, longitude, radius, wind speed, and rainfall) across coastal Odisha districts.</p>
            </motion.div>

            <motion.div className="step-card" variants={itemVariants}>
              <div className="card-badge-num">02</div>
              <div className="icon-blob purple">
                <Activity size={22} color="#a855f7" />
              </div>
              <h3>PyTorch LSTM Risk Model</h3>
              <p>Forecasting road flood risk probabilities across 3 future timesteps (T=0, T+12h, T+24h) combining physical proximity decay.</p>
            </motion.div>

            <motion.div className="step-card" variants={itemVariants}>
              <div className="card-badge-num">03</div>
              <div className="icon-blob indigo">
                <Cpu size={22} color="#6366f1" />
              </div>
              <h3>Qiskit QAOA Circuit Solver</h3>
              <p>Formulates QUBO cost matrices executed on Qiskit Aer statevector simulators or IBM Quantum QPUs to solve assignments.</p>
            </motion.div>

            <motion.div className="step-card" variants={itemVariants}>
              <div className="card-badge-num">04</div>
              <div className="icon-blob green">
                <MapPin size={22} color="#10b981" />
              </div>
              <h3>OSRM Parallel Geometry</h3>
              <p>Fetches exact driving road geometries in parallel via Open Source Routing Machine APIs, rendered live on Leaflet maps.</p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Capabilities */}
      <section id="capabilities" className="warmwind-section light-bg">
        <div className="warmwind-container">
          <div className="section-pill-tag">
            <Zap size={14} /> CAPABILITIES
          </div>
          <h2 className="section-title">Engineered for Crisis Reliability</h2>

          <div className="features-grid">
            <div className="feature-pill-card">
              <div className="icon-blob-small">
                <ShieldCheck size={20} color="#06b6d4" />
              </div>
              <h4>Flood-Safe Route Prioritization</h4>
              <p>Reroutes traffic away from high-risk flood zones and cyclone eye trajectories using real-time risk scores.</p>
            </div>

            <div className="feature-pill-card">
              <div className="icon-blob-small">
                <Layers size={20} color="#35cb91" />
              </div>
              <h4>Quadratic Capacity Balancing</h4>
              <p>Soft penalty QUBO constraints enforce shelter capacity limits, preventing overfill congestion at safe havens.</p>
            </div>

            <div className="feature-pill-card">
              <div className="icon-blob-small">
                <Cpu size={20} color="#6366f1" />
              </div>
              <h4>Pluggable Provider Architecture</h4>
              <p>Supports local Qiskit Aer, real IBM Quantum Cloud QPU hardware execution, and classical heuristic fallback solvers.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Action Footer Banner */}
      <section className="warmwind-banner-section">
        <div className="banner-card">
          <h2>Ready to Launch the Evacuation Engine?</h2>
          <p>Test real-time optimization on Puri, Kendrapara, Ganjam, and Jagatsinghpur datasets.</p>
          <button className="warmwind-btn-primary large" onClick={onLaunchOptimizer}>
            Launch Live Engine Dashboard <ArrowRight size={18} />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="warmwind-footer">
        <div className="footer-container">
          <div className="footer-brand">quanevac · Quantum Evacuation Platform</div>
          <div className="footer-copy">© 2026 Quanevac. MIT License.</div>
        </div>
      </footer>
    </div>
  );
}
