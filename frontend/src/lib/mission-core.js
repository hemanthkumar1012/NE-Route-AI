export function scoreMissionLeg(etaMinutes, meanRisk, priority = 'NORMAL') {
  const multiplier = priority === 'CRITICAL' ? 1.2 : priority === 'HIGH' ? 1 : 0.6;
  return etaMinutes + meanRisk * multiplier;
}

export function orderReachableStops(stops, legsByKey) {
  const remaining = [...stops];
  const result = [];
  let current = 'origin';
  while (remaining.length) {
    const choices = remaining.map(stop => ({ stop, leg: legsByKey[`${current}->${stop.node}`] }))
      .filter(item => item.leg && item.leg.available)
      .sort((a, b) => scoreMissionLeg(a.leg.eta_minutes, a.leg.mean_risk_score, a.stop.priority) - scoreMissionLeg(b.leg.eta_minutes, b.leg.mean_risk_score, b.stop.priority));
    if (!choices.length) break;
    const next = choices[0];
    result.push(next.stop);
    remaining.splice(remaining.indexOf(next.stop), 1);
    current = next.stop.node;
  }
  return { ordered: result, unreachable: remaining };
}
