import { stayNights } from './reservation-edit-limits';

interface CountedStay {
  family_group: string;
  start_date: string;
  end_date: string;
  time_period_number: number | null;
  status?: string | null;
}
export function selectionDisplayCounts(stays: CountedStay[]) {
  const counts = new Map<string, { primary: number; secondary: number }>();
  for (const stay of stays) {
    if (stay.status === 'cancelled') continue;
    const nights = stayNights(stay.start_date, stay.end_date);
    if (!Number.isFinite(nights) || nights < 1) continue;
    const current = counts.get(stay.family_group) || { primary: 0, secondary: 0 };
    current[stay.time_period_number === -1 ? 'secondary' : 'primary'] += Math.max(1, Math.round(nights / 7));
    counts.set(stay.family_group, current);
  }
  return counts;
}