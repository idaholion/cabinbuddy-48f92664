import { expect, test } from 'bun:test';
import { isRoundCompleted, completionPhase, nextIncompleteFamily } from './selection-round-completion';

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

const order = ['Comeau Family', 'Grandy Family', 'Andrew Family', 'Cook Family', 'Woolf Family', 'Poznanovich Family'];
const rows = order.map(family_group => ({ family_group, rotation_year: 2027, primary_turn_completed: true, secondary_turn_completed: false, secondary_periods_used: 1 }));

test('one Round 2 pick without Done must not skip the next family', () => {
  expect(nextIncompleteFamily(rows, order, 2027, 'secondary', 'Comeau Family')).toBe('Grandy Family');
});
test('completed zero-pick Debbie does not keep a finished season in Round 2', () => {
  const finished = rows.map(row => ({ ...row, secondary_turn_completed: true, secondary_periods_used: row.family_group === 'Poznanovich Family' ? 0 : 1 }));
  expect(completionPhase(finished, order, 2027, { started_at: '2026-11-12', current_family_group: null })).toBe('post_rotation');
  expect(completionPhase(finished, order, 2027, null)).toBe('post_rotation');
});
test('booked allocations alone cannot open free selection', () => {
  expect(completionPhase(rows, order, 2027, { started_at: '2026-11-12', current_family_group: null })).toBe('secondary');
});
test('secondary Done hands off through every family and never loops to outgoing', () => {
  const state = rows.map(row => ({ ...row, secondary_turn_completed: false }));
  let family: string | null = order[0];
  const visited: string[] = [];
  while (family) {
    visited.push(family);
    const next = nextIncompleteFamily(state, order, 2027, 'secondary', family);
    const outgoing = state.find(row => row.family_group === family);
    if (outgoing) outgoing.secondary_turn_completed = true;
    family = next;
  }
  expect(visited).toEqual(order);
  expect(completionPhase(state, order, 2027, { started_at: '2026-11-12', current_family_group: null })).toBe('post_rotation');
});
test('missing or wrong-year next records stop handoff rather than silently skip', () => {
  expect(() => nextIncompleteFamily(rows.slice(0, 1), order, 2027, 'secondary', 'Comeau Family')).toThrow();
  expect(() => nextIncompleteFamily(rows.map(row => ({ ...row, rotation_year: 2026 })), order, 2027, 'secondary', 'Comeau Family')).toThrow();
});
test('a handoff never reopens earlier completed turns', () => {
  expect(nextIncompleteFamily(rows, order, 2027, 'secondary', 'Poznanovich Family')).toBeNull();
});