import { expect, test } from 'bun:test';
import { isRoundCompleted } from './selection-round-completion';

test('Round 1 Done never completes Round 2', () => {
  const row = { rotation_year: 2027, turn_completed: true, primary_turn_completed: true, secondary_turn_completed: false };
  expect(isRoundCompleted(row, 2027, 'primary')).toBe(true);
  expect(isRoundCompleted(row, 2027, 'secondary')).toBe(false);
});

test('Debbie can finish Round 2 explicitly with zero bookings', () => {
  const row = { rotation_year: 2027, primary_turn_completed: true, secondary_turn_completed: true, secondary_periods_used: 0 };
  expect(isRoundCompleted(row, 2027, 'secondary')).toBe(true);
});

test('using all picks without Done does not finish either round', () => {
  const row = { rotation_year: 2027, primary_turn_completed: false, secondary_turn_completed: false, time_periods_used: 2, secondary_periods_used: 1 };
  expect(isRoundCompleted(row, 2027, 'primary')).toBe(false);
  expect(isRoundCompleted(row, 2027, 'secondary')).toBe(false);
});

test('2026 Done does not complete 2027 turns', () => {
  const row = { rotation_year: 2026, primary_turn_completed: true, secondary_turn_completed: true };
  expect(isRoundCompleted(row, 2027, 'primary')).toBe(false);
  expect(isRoundCompleted(row, 2027, 'secondary')).toBe(false);
});

test('legacy Done is compatible only with Round 1', () => {
  const row = { rotation_year: 2027, turn_completed: true };
  expect(isRoundCompleted(row, 2027, 'primary')).toBe(true);
  expect(isRoundCompleted(row, 2027, 'secondary')).toBe(false);
});

test('an explicit new Round 1 value overrides the legacy value', () => {
  expect(isRoundCompleted({ rotation_year: 2027, turn_completed: true, primary_turn_completed: false }, 2027, 'primary')).toBe(false);
});

test('missing records cannot indicate completion', () => {
  expect(isRoundCompleted(null, 2027, 'primary')).toBe(false);
  expect(isRoundCompleted(undefined, 2027, 'secondary')).toBe(false);
});