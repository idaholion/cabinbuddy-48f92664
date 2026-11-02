import { describe, expect, test } from 'bun:test';
import { countOrphanedPayments } from './orphaned-payments';

const payment = {
  id: 'poznanovich-900',
  reservation_id: null,
  daily_occupancy: [{ date: '2026-07-31', guests: 2 }],
  notes: '$900 Venmo',
};

describe('orphaned payment warning', () => {
  test('excludes a recipient linked by its split record without special note wording', () => {
    expect(countOrphanedPayments([payment], [{ split_payment_id: payment.id }])).toBe(0);
  });
  test('excludes a source payment connected to a split', () => {
    expect(countOrphanedPayments([payment], [{ source_payment_id: payment.id }])).toBe(0);
  });
  test('still reports an unconnected payment with occupancy', () => {
    expect(countOrphanedPayments([payment], [{ split_payment_id: 'another-payment' }])).toBe(1);
  });
  test('preserves legacy split-note exclusion', () => {
    expect(countOrphanedPayments([{ ...payment, notes: 'Carson, Split From Tina' }], [])).toBe(0);
  });
  test('ignores reservation-linked payments and records without occupancy', () => {
    expect(countOrphanedPayments([
      { ...payment, reservation_id: 'stay' },
      { ...payment, daily_occupancy: [] },
      { ...payment, daily_occupancy: null },
    ], [])).toBe(0);
  });
});