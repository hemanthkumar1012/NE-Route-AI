export function classifyRisk(score: number, isClosed?: boolean): 'BLOCKED' | 'HIGH_RISK' | 'CAUTION' | 'SAFE';
export function resilienceIndex(scores: number[], blockedCount?: number): number;
