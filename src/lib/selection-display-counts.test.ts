import { expect, test } from 'bun:test';
import { selectionDisplayCounts } from './selection-display-counts';
const stay = { family_group: 'Andrew', start_date: '2027-07-02', end_date: '2027-07-09', time_period_number: -1, status: 'confirmed' };
test('accepted secondary week displays 1 immediately from saved reservations', () => {
  expect(selectionDisplayCounts([stay]).get('Andrew')?.secondary).toBe(1);
});
test('unused week still consumes its pick', () => {
  expect(selectionDisplayCounts([{ ...stay, status: 'unused' }]).get('Andrew')?.secondary).toBe(1);
});
test('cancelled week does not consume a pick', () => {
  expect(selectionDisplayCounts([{ ...stay, status: 'cancelled' }]).has('Andrew')).toBe(false);
});