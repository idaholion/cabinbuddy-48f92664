import { describe, expect, test } from 'bun:test';
import { validateReservationEditLimits } from './reservation-edit-limits';

const original = { id: 'stay', family_group: 'Andrew Family', start_date: '2026-10-24', end_date: '2026-10-26' };
const freeSettings = { enable_secondary_selection: true, enable_post_rotation_selection: true };
const check = (options: Partial<Parameters<typeof validateReservationEditLimits>[0]> = {}) => validateReservationEditLimits({
  original, start: original.start_date, end: '2026-10-27', settings: freeSettings, reservations: [original], ...options,
});
describe('Reservation extension safeguards', () => {
  test('October 24–26 can extend to October 27 in third round', () => expect(check()).toEqual([]));
  test('third-round 14-night maximum remains enforced', () => expect(check({ end: '2026-11-08' }).some(e => e.includes('14 consecutive'))).toBe(true));
  test('first-round extensions cannot bypass turn order', () => expect(check({ settings: {}, primaryCurrentFamily: 'Woolf Family' }).some(e => e.includes('selection turn'))).toBe(true));
  test('first-round 14-night family budget excludes the edited stay once', () => {
    const other = { ...original, id: 'other', start_date: '2026-07-01', end_date: '2026-07-13' };
    expect(check({ settings: {}, primaryCurrentFamily: 'Andrew Family', reservations: [original, other] }).some(e => e.includes('14-night'))).toBe(true);
  });
  test('second-round 7-night family budget is enforced', () => expect(check({ original: { ...original, time_period_number: -1 },
    settings: { enable_secondary_selection: true }, secondaryStartedAt: '2025-12-01', secondaryCurrentFamily: 'Andrew Family',
    reservations: [{ ...original, id: 'other', time_period_number: -1, start_date: '2026-08-01', end_date: '2026-08-07' }],
  }).some(e => e.includes('7-night'))).toBe(true));
  test('shortening is allowed after the turn ends', () => expect(check({ settings: {}, primaryCurrentFamily: 'Woolf Family', end: '2026-10-25' })).toEqual([]));
  test('same-length moves cannot bypass turn order', () => expect(check({ settings: {}, primaryCurrentFamily: 'Woolf Family', start: '2026-10-25', end: '2026-10-27' }).some(e => e.includes('selection turn'))).toBe(true));
  test('assigned boundaries remain protected', () => expect(check({ original: { ...original, allocated_end_date: '2026-10-26' } }).some(e => e.includes('assigned dates'))).toBe(true));
  test('no double counting at exactly 14 primary nights', () => expect(check({ settings: {}, primaryCurrentFamily: 'Andrew Family', end: '2026-11-07' })).toEqual([]));
});