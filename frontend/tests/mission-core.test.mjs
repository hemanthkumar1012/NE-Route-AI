import test from 'node:test';
import assert from 'node:assert/strict';
import { scoreMissionLeg, orderReachableStops } from '../src/lib/mission-core.js';

test('critical cargo receives a larger risk penalty', () => assert.ok(scoreMissionLeg(20, 80, 'CRITICAL') > scoreMissionLeg(20, 80, 'LOW')));
test('mission planner keeps unreachable stops separate', () => {
  const stops = [{name:'Clinic',node:'B',priority:'CRITICAL'},{name:'Remote',node:'Z',priority:'NORMAL'}];
  const result = orderReachableStops(stops, {'origin->B':{available:true,eta_minutes:20,mean_risk_score:10}});
  assert.equal(result.ordered[0].name, 'Clinic');
  assert.equal(result.unreachable[0].name, 'Remote');
});
