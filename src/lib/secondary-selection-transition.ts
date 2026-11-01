interface Usage {
  family_group: string;
  rotation_year: number;
  turn_completed?: boolean | null;
  secondary_periods_used?: number | null;
}

export function planSecondaryTransition(year: number, order: string[], enabled: boolean, usage: Usage[], limit = 1) {
  const rows = usage.filter(row => row.rotation_year === year);
  if (!enabled || !order.length || !order.every(family => rows.find(row => row.family_group === family)?.turn_completed === true)) return null;
  const reverse = [...order].reverse();
  const index = reverse.findIndex(family => (rows.find(row => row.family_group === family)?.secondary_periods_used ?? 0) < limit);
  return { current_family_group: index < 0 ? null : reverse[index], current_group_index: Math.max(0, index) };
}