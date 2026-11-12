export type SelectionRound = 'primary' | 'secondary';

export interface RoundCompletionRecord {
  rotation_year: number;
  turn_completed?: boolean | null;
  primary_turn_completed?: boolean | null;
  secondary_turn_completed?: boolean | null;
}

export interface FamilyRoundCompletion extends RoundCompletionRecord {
  family_group: string;
}

export function allRoundCompleted(rows: FamilyRoundCompletion[], order: string[], year: number, round: SelectionRound): boolean {
  return order.length > 0 && order.every(family => isRoundCompleted(rows.find(row => row.family_group === family), year, round));
}

// The outgoing family is excluded even before its atomic handoff has saved Done.
export function nextIncompleteFamily(rows: FamilyRoundCompletion[], order: string[], year: number, round: SelectionRound, outgoing: string): string | null {
  const index = order.indexOf(outgoing);
  if (index < 0) throw new Error('The current family is not in the saved selection order.');
  for (const family of order.slice(index + 1)) {
    const row = rows.find(row => row.family_group === family && row.rotation_year === year);
    if (!row) throw new Error(`Selection completion is missing for ${family}. Please contact the calendar keeper.`);
    if (!isRoundCompleted(row, year, round)) return family;
  }
  return null;
}

export function completionPhase(rows: FamilyRoundCompletion[], order: string[], year: number, secondary?: { started_at?: string | null; current_family_group?: string | null } | null): SelectionRound | 'post_rotation' {
  if (secondary?.started_at || secondary?.current_family_group) {
    return !secondary.current_family_group && allRoundCompleted(rows, order, year, 'secondary') ? 'post_rotation' : 'secondary';
  }
  // Completed records preserve a finished season even if its old status row is absent.
  if (allRoundCompleted(rows, order, year, 'primary') && allRoundCompleted(rows, order, year, 'secondary')) return 'post_rotation';
  return 'primary';
}

// Legacy completion belongs only to Round 1. Never infer Done from bookings.
export function isRoundCompleted(record: RoundCompletionRecord | null | undefined, year: number, round: SelectionRound): boolean {
  if (!record || record.rotation_year !== year) return false;
  return round === 'primary'
    ? (record.primary_turn_completed ?? record.turn_completed) === true
    : record.secondary_turn_completed === true;
}