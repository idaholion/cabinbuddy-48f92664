import { expect, test } from 'bun:test';
import { canReconcileSelectionUsage, selectionUsageCountUpdate } from './selection-usage-reconciliation';

test('recounting never resets finished seasons including zero-pick Done', () => {
  expect(canReconcileSelectionUsage({ current_primary_turn_family: null }, { started_at: '2026-11-12T18:28:56Z', current_family_group: null })).toBe(false);
});

test('recounting cannot rewrite an active primary or secondary round', () => {
  expect(canReconcileSelectionUsage({ current_primary_turn_family: 'Andrew Family' }, null)).toBe(false);
  expect(canReconcileSelectionUsage({ current_primary_turn_family: null }, { current_family_group: 'Woolf Family' })).toBe(false);
});

test('recounting requires saved target-year settings', () => {
  expect(canReconcileSelectionUsage(null, null)).toBe(false);
});

test('an unstarted season can reconcile counts without completing turns', () => {
  expect(canReconcileSelectionUsage({ current_primary_turn_family: null }, null)).toBe(true);
  expect(selectionUsageCountUpdate(2, 1, '2026-11-12T23:05:00Z')).toEqual({ time_periods_used: 2, secondary_periods_used: 1, last_selection_date: '2026-11-12T23:05:00Z' });
});