import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyRisk, resilienceIndex } from '../src/lib/risk.js';

test('closed roads override a low model risk score', () => assert.equal(classifyRisk(5, true), 'BLOCKED'));
test('risk thresholds are stable', () => {
  assert.equal(classifyRisk(20), 'SAFE');
  assert.equal(classifyRisk(40), 'CAUTION');
  assert.equal(classifyRisk(70), 'HIGH_RISK');
});
test('resilience score is bounded', () => assert.ok(resilienceIndex([10, 20, 30], 2) >= 0));
