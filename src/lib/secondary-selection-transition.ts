import { allRoundCompleted, isRoundCompleted, type FamilyRoundCompletion } from './selection-round-completion';

interface Usage extends FamilyRoundCompletion { secondary_periods_used?: number | null; }

export function planSecondaryTransition(year: number, order: string[], enabled: boolean, usage: Usage[], limit = 1) {
  const rows = usage.filter(row => row.rotation_year === year);
  if (!enabled || !allRoundCompleted(rows, order, year, 'primary')) return null;
  const reverse = [...order].reverse();
  const index = reverse.findIndex(family => !isRoundCompleted(rows.find(row => row.family_group === family), year, 'secondary'));
  return { current_family_group: index < 0 ? null : reverse[index], current_group_index: Math.max(0, index) };
}