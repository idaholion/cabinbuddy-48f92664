// Recounting bookings is never a completion action and cannot rewrite a live
// or finished selection season. New seasons are initialized by season setup.
export function canReconcileSelectionUsage(settings: { current_primary_turn_family?: string | null } | null, secondary: { started_at?: string | null; current_family_group?: string | null } | null): boolean {
  return !!settings && !settings.current_primary_turn_family && !secondary?.started_at && !secondary?.current_family_group;
}

export function selectionUsageCountUpdate(primary: number, secondary: number, timestamp: string) {
  return { time_periods_used: primary, secondary_periods_used: secondary, last_selection_date: timestamp };
}