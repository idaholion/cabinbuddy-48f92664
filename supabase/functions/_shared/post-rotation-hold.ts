// Free-selection hold: pure helpers shared by booking checks and displays.
// Copy of src/lib/post-rotation-hold.ts for edge functions; keep in sync.
export const HOLD_TIME_ZONE = 'America/Denver';
export const DEFAULT_OPEN_TIME = '19:00';

export interface HoldSettings {
  enable_post_rotation_selection?: boolean | null;
  post_rotation_hold_days?: number | null;
  post_rotation_open_time?: string | null;
  post_rotation_opens_at?: string | null;
}
export interface RoundStatus { started_at?: string | null; current_family_group?: string | null }

function offsetMinutes(at: Date): number {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: HOLD_TIME_ZONE, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }).formatToParts(at);
  const get = (t: string) => Number(parts.find(p => p.type === t)?.value);
  return (Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second')) - at.getTime()) / 60000;
}

/** Mountain-time calendar date (YYYY-MM-DD) for an instant. */
export function mountainDate(at: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: HOLD_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(at);
}

/** Converts a Mountain-time wall clock date/time to the exact instant. */
export function mountainToInstant(date: string, time = DEFAULT_OPEN_TIME): Date {
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  const first = guess - offsetMinutes(new Date(guess)) * 60000;
  return new Date(guess - offsetMinutes(new Date(first)) * 60000);
}

export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** Opening instant: the Mountain date the rounds ended plus the hold days, at the opening time. */
export function holdOpening(roundsEndedAt: Date, holdDays: number, time = DEFAULT_OPEN_TIME): Date {
  return mountainToInstant(addDays(mountainDate(roundsEndedAt), holdDays), time);
}

export type FreeSelectionState =
  | { state: 'rounds_active' }
  | { state: 'not_enabled' }
  | { state: 'awaiting_date' }
  | { state: 'locked'; opensAt: Date }
  | { state: 'open' };

/** Rounds are complete once the secondary round started and no family holds a turn. */
export function freeSelectionState(settings: HoldSettings & { current_primary_turn_family?: string | null }, secondary: RoundStatus | null | undefined, now = new Date()): FreeSelectionState {
  if (settings.current_primary_turn_family || !secondary?.started_at || secondary.current_family_group) return { state: 'rounds_active' };
  if (!settings.enable_post_rotation_selection) return { state: 'not_enabled' };
  if (settings.post_rotation_opens_at) {
    const opensAt = new Date(settings.post_rotation_opens_at);
    return now < opensAt ? { state: 'locked', opensAt } : { state: 'open' };
  }
  return (settings.post_rotation_hold_days || 0) > 0 ? { state: 'awaiting_date' } : { state: 'open' };
}

export function formatOpening(at: Date): string {
  return new Intl.DateTimeFormat('en-US', { timeZone: HOLD_TIME_ZONE, weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(at) + ' MT';
}
