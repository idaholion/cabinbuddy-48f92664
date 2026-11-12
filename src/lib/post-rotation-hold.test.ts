import { describe, expect, test } from 'bun:test';
import { freeSelectionState, holdOpening } from './post-rotation-hold';
import { validateReservationCreation } from './reservation-create-limits';

const done = { started_at: '2026-11-01T00:00:00Z', current_family_group: null };
const base = { rotation_year: 2027, enable_secondary_selection: true, enable_post_rotation_selection: true };

describe('free selection hold', () => {
  test('one-week hold opens at 7 PM Mountain a week after the rounds end', () => {
    // Nov 12 2026 1:47 PM MT -> Nov 19 7:00 PM MST (02:00 UTC Nov 20)
    expect(holdOpening(new Date('2026-11-12T20:47:00Z'), 7).toISOString()).toBe('2026-11-20T02:00:00.000Z');
  });
  test('summer opening uses daylight time', () => {
    expect(holdOpening(new Date('2027-06-01T18:00:00Z'), 7).toISOString()).toBe('2027-06-09T01:00:00.000Z');
  });
  test('locked before opening, open after', () => {
    const s = { ...base, post_rotation_opens_at: '2026-11-20T02:00:00Z' };
    expect(freeSelectionState(s, done, new Date('2026-11-20T01:59:00Z')).state).toBe('locked');
    expect(freeSelectionState(s, done, new Date('2026-11-20T02:00:00Z')).state).toBe('open');
  });
  test('hold days set but no date yet stays closed', () => {
    expect(freeSelectionState({ ...base, post_rotation_hold_days: 7 }, done).state).toBe('awaiting_date');
  });
  test('no hold keeps immediate free selection', () => {
    expect(freeSelectionState(base, done).state).toBe('open');
  });
  test('active secondary turn is not free selection', () => {
    expect(freeSelectionState(base, { ...done, current_family_group: 'Woolf' }).state).toBe('rounds_active');
  });
  test('members cannot book during the hold; calendar keeper can', () => {
    const settings = { ...base, post_rotation_opens_at: '2999-01-01T00:00:00Z' };
    const args = { start: '2027-07-01', end: '2027-07-04', family: 'Cook', settings, secondary: done, reservations: [] };
    expect(validateReservationCreation(args).join(' ')).toContain('Free selection opens');
    expect(validateReservationCreation({ ...args, privileged: true })).toEqual([]);
  });
});
