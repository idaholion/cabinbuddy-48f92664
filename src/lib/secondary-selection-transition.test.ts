/// <reference types="bun" />
import { expect, test } from 'bun:test';
import { planSecondaryTransition } from './secondary-selection-transition';
import { validateReservationCreation } from './reservation-create-limits';

const order = ['Andrew Family', 'Barb Family', 'Tina Family'];
const usage = order.map(family_group => ({ family_group, rotation_year: 2027, turn_completed: true, secondary_periods_used: 0 }));
test('Tina is first in round two after the last explicit primary Done', () => {
  expect(planSecondaryTransition(2027, order, true, usage)).toEqual({ current_family_group: 'Tina Family', current_group_index: 0 });
});
test('two primary picks without Done do not start round two', () => {
  expect(planSecondaryTransition(2027, order, true, usage.map(row => ({ ...row, turn_completed: row.family_group !== 'Tina Family' })))).toBeNull();
});
test('2026 completion cannot start 2027 round two', () => {
  expect(planSecondaryTransition(2027, order, true, usage.map(row => ({ ...row, rotation_year: 2026 })))).toBeNull();
});
test('missing completion records fail closed', () => {
  expect(planSecondaryTransition(2027, order, true, usage.slice(0, 2))).toBeNull();
});
test('disabled and empty rotations cannot start round two', () => {
  expect(planSecondaryTransition(2027, order, false, usage)).toBeNull();
  expect(planSecondaryTransition(2027, [], true, usage)).toBeNull();
});
test('reverse rotation skips an exhausted secondary allocation', () => {
  expect(planSecondaryTransition(2027, order, true, usage.map(row => ({ ...row, secondary_periods_used: row.family_group === 'Tina Family' ? 1 : 0 })))?.current_family_group).toBe('Barb Family');
});
test('Tina can book her third week, but Barb must wait', () => {
  const turn = planSecondaryTransition(2027, order, true, usage);
  const input = { start: '2027-08-06', end: '2027-08-13', family: 'Tina Family', settings: { rotation_year: 2027, current_primary_turn_family: null, enable_secondary_selection: true, enable_post_rotation_selection: true }, secondary: { ...turn, started_at: '2026-11-01T23:48:00Z' }, reservations: [{ id: 'primary', family_group: 'Tina Family', start_date: '2027-07-09', end_date: '2027-07-23', time_period_number: 1 }] };
  expect(validateReservationCreation(input)).toEqual([]);
  expect(validateReservationCreation({ ...input, family: 'Barb Family' }).some(error => error.includes('Tina Family’s selection turn'))).toBe(true);
});