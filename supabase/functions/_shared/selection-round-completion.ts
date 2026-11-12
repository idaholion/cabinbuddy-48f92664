export interface RoundCompletionRecord {
  rotation_year: number;
  turn_completed?: boolean | null;
  primary_turn_completed?: boolean | null;
  secondary_turn_completed?: boolean | null;
}

export function isRoundCompleted(record: RoundCompletionRecord | null | undefined, year: number, round: 'primary' | 'secondary'): boolean {
  if (!record || record.rotation_year !== year) return false;
  return round === 'primary'
    ? (record.primary_turn_completed ?? record.turn_completed) === true
    : record.secondary_turn_completed === true;
}