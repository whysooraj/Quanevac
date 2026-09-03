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
  Database
} from 'lucide-react';

export default function LandingPage({ onLaunchOptimizer }) {
  const heroRef = useRef(null);

  useEffect(() => {
    if (heroRef.current) {
      gsap.fromTo(
        heroRef.current,
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 1.2, ease: 'power3.out' }
      );
    }
  }, []);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.15, delayChildren: 0.2 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] } }
  };

  return (
    <div className="landing-container">
      {/* Background Glow Accents */}
      <div className="bg-glow glow-top"></div>
      <div className="bg-glow glow-bottom"></div>

      {/* Navigation Bar */}
      <nav className="landing-nav">
        <div className="nav-brand-group">
          <span className="landing-logo">QUANEVAC</span>
          <span className="nav-subtitle">Quantum Disaster Optimization Engine</span>
        </div>
        <div className="nav-links">
          <a href="#how-it-works">Architecture</a>
          <a href="#features">Capabilities</a>
          <button className="nav-cta-btn" onClick={onLaunchOptimizer}>
            Launch Optimizer <ArrowRight size={14} />
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero-section" ref={heroRef}>
        <motion.div 
          className="hero-badge"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
        >
          <Sparkles size={13} /> HYBRID ML + QUANTUM APPROXIMATE OPTIMIZATION
        </motion.div>

        <h1 className="hero-title">
          Quantum Intelligence for <br />
          <span className="gradient-text">Mass Disaster Evacuation</span>
        </h1>

        <p className="hero-description">
          Engineered for coastal cyclone response, Quanevac combines <strong>PyTorch LSTM neural forecasting</strong> with 
          <strong>Qiskit QAOA quantum circuits</strong> to compute optimal shelter assignments and flood-safe evacuation routes in under a second.
        </p>

        <div className="hero-cta-group">
          <button className="btn-hero-primary" onClick={onLaunchOptimizer}>
            Explore Live Optimizer <ArrowRight size={16} />
          </button>
          <a href="#how-it-works" className="btn-hero-secondary">
            How It Works
          </a>
        </div>

        {/* Quick Highlights Grid */}
        <div className="stats-row">
          <div className="stat-card">
            <div className="stat-num">&lt; 1 sec</div>
            <div className="stat-label">Sub-second Optimization</div>
          </div>
          <div className="stat-card">
            <div className="stat-num">35% +</div>
            <div className="stat-label">Shelter Load Balancing</div>
          </div>
          <div className="stat-card">
            <div className="stat-num">QAOA + Aer</div>
            <div className="stat-label">Quantum Circuit Solver</div>
          </div>
          <div className="stat-card">
            <div className="stat-num">100%</div>
            <div className="stat-label">Real Road Geometries</div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="pipeline-section">
        <div className="section-header">
          <span className="section-tag">SYSTEM ARCHITECTURE</span>
          <h2>How Quanevac Works</h2>
          <p>A 4-step hybrid pipeline connecting physics, neural networks, and quantum circuits.</p>
        </div>

        <motion.div 
          className="pipeline-grid"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
        >
          {/* Step 1 */}
          <motion.div className="pipeline-card" variants={itemVariants}>
            <div className="step-num">01</div>
            <div className="step-icon"><Compass size={22} color="var(--accent-cyan)" /></div>
            <h3>Storm Track Ingestion</h3>
            <p>Monitors live cyclone parameters (latitude, longitude, radius, wind speed, and rainfall intensity) for Odisha coastal districts.</p>
          </motion.div>

          {/* Step 2 */}
          <motion.div className="pipeline-card" variants={itemVariants}>
            <div className="step-num">02</div>
            <div className="step-icon"><Activity size={22} color="#a855f7" /></div>
            <h3>PyTorch LSTM Risk Engine</h3>
            <p>Evaluates 3-timestep forecast sequences ($T=0$, $T+12\text{h}$, $T+24\text{h}$) to compute road flood risk probabilities $[0.05, 0.95]$.</p>
          </motion.div>

          {/* Step 3 */}
          <motion.div className="pipeline-card" variants={itemVariants}>
            <div className="step-num">03</div>
            <div className="step-icon"><Cpu size={22} color="#6366f1" /></div>
            <h3>Qiskit QAOA Optimization</h3>
            <p>Formulates quadratic unconstrained binary optimization (QUBO) matrices solved via QAOA circuits on Qiskit Aer or IBM Quantum QPUs.</p>
          </motion.div>

          {/* Step 4 */}
          <motion.div className="pipeline-card" variants={itemVariants}>
            <div className="step-num">04</div>
            <div className="step-icon"><MapPin size={22} color="#10b981" /></div>
            <h3>OSRM Road Routing</h3>
            <p>Queries Open Source Routing Machine APIs in parallel to stream real road geometry polylines directly onto Leaflet maps.</p>
          </motion.div>
        </motion.div>
      </section>

      {/* Core Capabilities */}
      <section id="features" className="capabilities-section">
        <div className="section-header">
          <span className="section-tag">KEY ADVANTAGES</span>
          <h2>Capabilities & Technological Edge</h2>
        </div>

        <div className="features-grid">
          <div className="feature-box">
            <ShieldCheck className="feature-icon" size={24} />
            <h4>Disaster-Resilient Routing</h4>
            <p>Dynamically re-routes civilian populations away from storm eye corridors and flooded road segments.</p>
          </div>

          <div className="feature-box">
            <Layers className="feature-icon" size={24} />
            <h4>Capacity Balancing</h4>
            <p>Penalizes shelter overfill using quadratic constraints, maintaining even distribution across district shelters.</p>
          </div>

          <div className="feature-box">
            <Cpu className="feature-icon" size={24} />
            <h4>Pluggable Provider Layer</h4>
            <p>Executes locally via Qiskit Aer simulator, on IBM Quantum QPU hardware, or via classical fallback solvers.</p>
          </div>
        </div>
      </section>

      {/* CTA Footer Banner */}
      <section className="cta-banner">
        <h2>Ready to Explore the Quantum Evacuation Engine?</h2>
        <p>Experience sub-second route optimization across Puri, Kendrapara, Ganjam, and Jagatsinghpur.</p>
        <button className="btn-hero-primary" onClick={onLaunchOptimizer}>
          Enter Live Optimizer Dashboard <ArrowRight size={16} />
        </button>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div>© 2026 Quanevac · Odisha Quantum Disaster Response Engine</div>
      </footer>
    </div>
  );
}
