import { assertEquals } from 'https://deno.land/std@0.190.0/testing/asserts.ts';
import { isRoundCompleted } from '../_shared/selection-round-completion.ts';

Deno.test('notification completion is separate by round and year', () => {
  const row = { rotation_year: 2027, primary_turn_completed: true, secondary_turn_completed: false, turn_completed: true };
  assertEquals(isRoundCompleted(row, 2027, 'primary'), true);
  assertEquals(isRoundCompleted(row, 2027, 'secondary'), false);
  assertEquals(isRoundCompleted(row, 2026, 'primary'), false);
});