import { describe, it, expect } from 'vitest';
import { classifyRisk, resilienceIndex } from '../lib/risk.js';

describe('risk utilities', () => {
  it('marks closed segments as blocked regardless of score', () => expect(classifyRisk(1, true)).toBe('BLOCKED'));
  it('calculates a bounded resilience index', () => expect(resilienceIndex([20, 40], 1)).toBeGreaterThanOrEqual(0));
  it('classifies high-risk corridors', () => expect(classifyRisk(80)).toBe('HIGH_RISK'));
});
