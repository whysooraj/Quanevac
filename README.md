# Quantum Evacuation Optimizer (Quanevac)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python 3.8+](https://img.shields.io/badge/python-3.8+-blue.svg)](https://www.python.org/downloads/)
[![React](https://img.shields.io/badge/react-18.2.0-61dafb.svg)](https://reactjs.org/)
[![Qiskit](https://img.shields.io/badge/qiskit-1.0+-blue.svg)](https://qiskit.org/)

A cutting-edge disaster response system that leverages quantum computing and machine learning to optimize mass evacuation routes during cyclones and extreme weather events. Built for the Odisha coastline, this system demonstrates how quantum algorithms can save lives by finding optimal shelter assignments in real-time.

## 🎯 The Problem

Cyclone Fani (2019) evacuated 1.2 million people in Odisha with only 28 fatalities — a remarkable success. However, the evacuation consumed nearly the entire 72-hour warning window, leaving minimal margin for error. Traditional routing methods use simple distance-based assignments, which don't account for:

- Dynamic storm tracks and evolving risk zones
- Road flooding and infrastructure damage
- Shelter capacity constraints
- Population density and vulnerability factors

## 🚀 Solution Overview

Quanevac combines **Quantum Approximate Optimization Algorithm (QAOA)** with **machine learning** to solve the evacuation routing problem as a constrained optimization task. The system:

1. **Predicts Risk**: LSTM neural networks forecast flood probabilities based on storm tracks
2. **Optimizes Routes**: QAOA quantum circuits find optimal village-to-shelter assignments
3. **Visualizes Results**: Interactive maps show evacuation routes with real-time road geometries
4. **Scales Efficiently**: Hybrid classical-quantum approach handles large-scale evacuations

## ✨ Key Features

### 🔬 Quantum Optimization
- **QAOA Implementation**: Real quantum circuits running on Qiskit Aer simulator
- **QUBO Formulation**: Quadratic unconstrained binary optimization for assignment problems
- **Hybrid Approach**: Quantum optimization for critical routes, classical greedy for remaining
- **Capacity Constraints**: Respects shelter capacities with soft penalty terms

### 🤖 Machine Learning Risk Assessment
- **Temporal LSTM**: 3-timestep storm track forecasting
- **Physics-Informed**: Combines ML predictions with physical proximity calculations
- **Deterministic Features**: Elevation, road quality, rainfall, and wind speed proxies
- **Real-time Updates**: Risk scores update as storm parameters change

### 🗺️ Interactive Visualization
- **Leaflet Maps**: Real-time evacuation route visualization
- **OSRM Integration**: Actual road geometries from Open Source Routing Machine
- **Live Storm Tracking**: Drag-and-drop storm position with auto-reoptimization
- **Performance Metrics**: Comparative analysis of quantum vs classical approaches

### ⚡ Performance Highlights
- **Sub-Second Optimization**: Full pipeline completes in <1 second for 50+ villages
- **Scalable Architecture**: Handles regions with hundreds of villages and shelters
- **Real-Time Responsiveness**: Debounced re-optimization on parameter changes
- **Alert Integration**: Automatic optimization triggers on storm alerts

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React Frontend│    │  FastAPI Backend │    │   Qiskit Engine │
│                 │    │                 │    │                 │
│ • Leaflet Maps  │◄──►│ • REST API      │◄──►│ • QAOA Circuits │
│ • Dashboard UI  │    │ • CORS Enabled  │    │ • Aer Simulator│
│ • Real-time UI  │    │ • Async Routes  │    │ • QUBO Builder │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌─────────────────┐
                       │   ML Risk Engine│
                       │                 │
                       │ • PyTorch LSTM  │
                       │ • Feature Eng.  │
                       │ • Risk Scoring  │
                       └─────────────────┘
```

### Tech Stack

**Backend:**
- **Python 3.8+**: Core language
- **FastAPI**: High-performance async web framework
- **Qiskit**: Quantum computing framework
- **PyTorch**: Machine learning library
- **NetworkX**: Graph algorithms
- **httpx**: Async HTTP client for OSRM integration

**Frontend:**
- **React 18**: UI framework with hooks
- **Vite**: Fast build tool and dev server
- **Leaflet**: Interactive maps
- **Lucide React**: Modern icon library

**Data:**
- **JSON Datasets**: Villages and shelters for Odisha districts
- **OSRM API**: Real road geometries and routing
- **GDACS API**: Live cyclone tracking (with fallback simulation)

## 📦 Installation

### Prerequisites
- Python 3.8 or higher
- Node.js 16 or higher
- Git

### Backend Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/quanevac.git
   cd quanevac/backend
   ```

2. **Create virtual environment:**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Start the backend server:**
   ```bash
   python main.py
   ```
   The API will be available at `http://localhost:8000`

### Frontend Setup

1. **Navigate to frontend directory:**
   ```bash
   cd ../frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start development server:**
   ```bash
   npm run dev
   ```
   The app will be available at `http://localhost:5173`

## 🎮 Usage

### Basic Operation

1. **Select Region**: Choose from available districts (currently Puri/Jagatsinghpur)
2. **Monitor Alerts**: System polls for active storm alerts every 5 seconds
3. **Adjust Storm Parameters**: Use sliders to modify storm intensity and position
4. **Run Optimization**: Click "Optimize Routes" or wait for automatic triggers
5. **View Results**: Interactive map shows evacuation routes with metrics

### API Endpoints

#### GET `/api/data/{region}`
Returns base data for a region including villages, shelters, and connections.

**Response:**
```json
{
  "region_name": "Puri",
  "center": [19.8, 85.8],
  "villages": [...],
  "shelters": [...],
  "connections": [...]
}
```

#### POST `/api/optimize`
Runs the full quantum optimization pipeline.

**Request:**
```json
{
  "region": "Puri",
  "latitude": 19.85,
  "longitude": 85.85,
  "radius_km": 50,
  "wind_speed_kmh": 150,
  "rainfall_mm": 200
}
```

**Response:**
```json
{
  "status": "success",
  "quantum_execution_time_ms": 45.2,
  "total_pipeline_ms": 234.1,
  "qaoa_villages_solved": 5,
  "metrics": {...},
  "comparison": {...},
  "assignments": [...],
  "shelters": [...]
}
```

#### GET `/api/alerts`
Checks for active storm alerts.

#### POST `/api/alerts/reset`
Resets the alert system for testing.

## 📁 Project Structure

```
quanevac/
├── backend/
│   ├── main.py                 # FastAPI application
│   ├── requirements.txt        # Python dependencies
│   ├── services/
│   │   ├── quantum_optimizer.py # QAOA implementation
│   │   ├── ml_evaluator.py     # LSTM risk assessment
│   │   ├── risk_engine.py      # Data loading and connections
│   │   └── __pycache__/
│   └── data/
│       ├── villages.json       # Village data for Odisha
│       └── shelters.json       # Shelter data for Odisha
├── frontend/
│   ├── package.json
│   ├── vite.config.js
│   ├── index.html
│   └── src/
│       ├── App.jsx
│       ├── main.jsx
│       ├── index.css
│       └── components/
│           ├── Dashboard.jsx
│           ├── EvacuationMap.jsx
│           └── ...
└── README.md
```

## 🔬 Technical Details

### Quantum Optimization Algorithm

The system formulates evacuation routing as a **Quadratic Unconstrained Binary Optimization (QUBO)** problem:

- **Variables**: Binary assignments (village i → shelter j)
- **Objective**: Minimize total evacuation time weighted by risk
- **Constraints**: Each village assigned to exactly one shelter, capacity limits
- **Solution**: QAOA finds optimal assignments using quantum superposition

### Machine Learning Pipeline

**Feature Engineering:**
- Storm track sequences (3 timesteps)
- Distance to storm eye
- Elevation and road quality proxies
- Rainfall and wind intensity

**Model Architecture:**
- LSTM with 32 hidden units, 2 layers
- Physics-informed loss function
- Deterministic seed for reproducible results

### Performance Metrics

The system compares quantum vs classical approaches across:
- **Clearance Time**: Average evacuation duration
- **Load Balance**: Standard deviation of shelter utilization
- **Risk Exposure**: Total risk-weighted population exposure
- **High-Risk Routes**: Percentage of assignments with risk > 0.5

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and add tests
4. Run the test suite: `python -m pytest` (backend) / `npm test` (frontend)
5. Commit your changes: `git commit -m 'Add amazing feature'`
6. Push to the branch: `git push origin feature/amazing-feature`
7. Open a Pull Request

### Areas for Contribution

- **Algorithm Improvements**: Enhanced QAOA variants, alternative quantum approaches
- **ML Enhancements**: More sophisticated risk models, additional features
- **UI/UX**: Better visualizations, accessibility improvements
- **Data Expansion**: Additional regions, real-time data integration
- **Performance**: Optimization for larger problem sizes

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Odisha Government**: For open disaster response data
- **IBM Qiskit**: Quantum computing framework
- **Open Source Routing Machine**: Road network data
- **GDACS**: Global Disaster Alert and Coordination System



*Built with ❤️ for disaster resilience and quantum computing advancement*