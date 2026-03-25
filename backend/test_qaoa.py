import json, sys
sys.path.insert(0, '.')
from services.risk_engine import get_region_data
from services.ml_evaluator import evaluate_network_risk
from services.quantum_optimizer import run_quantum_evacuation_optimization

base = get_region_data('Puri')
storm = {'latitude': 19.85, 'longitude': 85.85, 'radius_km': 50, 'region': 'Puri'}
conns, ml_ms = evaluate_network_risk(base['connections'], storm, base['villages'], base['shelters'])
base['connections'] = conns
result = run_quantum_evacuation_optimization(base, storm)

print('Status:', result['status'])
print('QAOA ms:', result['quantum_execution_time_ms'])
print('QAOA villages solved:', result['qaoa_villages_solved'])
print('Total assignments:', len(result['assignments']))
print('Solvers:', set(a.get('solver','') for a in result['assignments']))
for s in result['shelters']:
    pct = s['current_occupancy'] / max(s['max_capacity'], 1) * 100
    print('Shelter', s['name'], ':', s['current_occupancy'], '/', s['max_capacity'], f'({pct:.0f}%)')
print('Improvements:', result['comparison']['improvements'])
