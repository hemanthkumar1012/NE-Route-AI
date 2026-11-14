export function classifyRisk(score, isClosed = false) {
  if (isClosed) return 'BLOCKED';
  if (score >= 65) return 'HIGH_RISK';
  if (score >= 35) return 'CAUTION';
  return 'SAFE';
}

export function resilienceIndex(scores, blockedCount = 0) {
  if (!scores.length) return 100;
  const mean = scores.reduce((sum, value) => sum + value, 0) / scores.length;
  return Math.max(0, Math.min(100, Math.round(100 - mean * 0.55 - blockedCount * 12)));
}
