/// <reference types="bun" />
import { describe, expect, test } from 'bun:test';
import { resolveBookingTurn, validateReservationCreation, type BookingSettings } from './reservation-create-limits';

const settings: BookingSettings = { rotation_year: 2027, current_primary_turn_family: 'Andrew Family', enable_secondary_selection: true, enable_post_rotation_selection: true };
const check = (changes: Partial<Parameters<typeof validateReservationCreation>[0]> = {}) => validateReservationCreation({
  start: '2027-07-09', end: '2027-07-16', family: 'Andrew Family', settings, reservations: [], ...changes,
});
describe('New reservation selection safeguards', () => {
  test('2027 bookings cannot use 2026 free-selection settings', () => {
    expect(check({ settings: { rotation_year: 2026, enable_secondary_selection: true, enable_post_rotation_selection: true } })).toContain('Selection settings do not match the booking year. Please try again.');
  });
  test('Dana cannot book while Andrew holds the primary turn, even with later rounds enabled', () => {
    expect(check({ family: 'Dana Family' }).some(e => e.includes('Andrew Family’s selection turn for 2027'))).toBe(true);
  });
  test('booking two weeks does not hand off Andrew’s turn without Done', () => {
    const stays = [{ id: 'two-weeks', family_group: 'Andrew Family', start_date: '2027-06-04', end_date: '2027-06-18' }];
    expect(check({ family: 'Dana Family', reservations: stays }).some(e => e.includes('Andrew Family’s selection turn'))).toBe(true);
    expect(resolveBookingTurn(settings).family).toBe('Andrew Family');
  });
  test('after explicit handoff only the saved next family can select', () => {
    const next = { ...settings, current_primary_turn_family: 'Dana Family' };
    expect(check({ settings: next, family: 'Dana Family' })).toEqual([]);
    expect(check({ settings: next }).some(e => e.includes('Dana Family’s selection turn'))).toBe(true);
  });
  test('secondary selections require the saved secondary family', () => {
    expect(check({ settings: { ...settings, current_primary_turn_family: null }, secondary: { started_at: '2026-12-01', current_family_group: 'Barb Family' } }).some(e => e.includes('Barb Family’s selection turn'))).toBe(true);
  });
  test('secondary current family can book its seven nights', () => {
    expect(check({ settings: { ...settings, current_primary_turn_family: null }, family: 'Barb Family', secondary: { started_at: '2026-12-01', current_family_group: 'Barb Family' } })).toEqual([]);
  });
  test('free selection allows any family after secondary turn clears', () => {
    expect(check({ settings: { ...settings, current_primary_turn_family: null }, family: 'Dana Family', secondary: { started_at: '2026-12-01', current_family_group: null } })).toEqual([]);
  });
  test('primary stays still have a two-week total allowance', () => {
    expect(check({ reservations: [{ id: 'existing', family_group: 'Andrew Family', start_date: '2027-06-04', end_date: '2027-06-18' }] }).some(e => e.includes('14-night allowance'))).toBe(true);
  });
  test('unused stays keep their selection count', () => {
    expect(check({ reservations: [{ id: 'unused', family_group: 'Andrew Family', start_date: '2027-06-04', end_date: '2027-06-18', status: 'unused' }] }).some(e => e.includes('2-selection allowance'))).toBe(true);
  });
  test('Admin/calendar keeper exception permits selecting on behalf of another family', () => {
    expect(check({ family: 'Dana Family', privileged: true })).toEqual([]);
  });
  test('no saved turn or open free selection fails closed', () => {
    expect(check({ settings: { rotation_year: 2027 } }).some(e => e.includes('Selection is not open'))).toBe(true);
  });
});