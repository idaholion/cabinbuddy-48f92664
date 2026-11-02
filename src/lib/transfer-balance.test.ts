import { describe, expect, test } from 'bun:test';
import { applyTransferToBalance } from './transfer-balance';
import { getStaysPaidLater } from './stay-settlement';

describe('incoming credit pays current debt first', () => {
  test('$120 against $280 leaves $160 owed and no forward credit', () => {
    expect(applyTransferToBalance(280, 120)).toEqual({ balance: 160, appliedToDebt: 120, creditForFuture: 0 });
  });
  test('Tina’s $80 transfer reduces existing debt by exactly $80', () => {
    expect(applyTransferToBalance(280, 80)).toEqual({ balance: 200, appliedToDebt: 80, creditForFuture: 0 });
  });
  test('a transfer exceeding the debt keeps only the unused amount for later', () => {
    expect(applyTransferToBalance(80, 120)).toEqual({ balance: -40, appliedToDebt: 80, creditForFuture: 40 });
  });
  test('no outstanding balance keeps the entire transfer for a future stay', () => {
    expect(applyTransferToBalance(0, 120)).toEqual({ balance: -120, appliedToDebt: 0, creditForFuture: 120 });
  });
  test('existing credit is retained along with the incoming transfer', () => {
    expect(applyTransferToBalance(-40, 120)).toEqual({ balance: -160, appliedToDebt: 0, creditForFuture: 120 });
  });
  test('paying old debt does not reuse the same $120 on a future stay', () => {
    const result = applyTransferToBalance(280, 120);
    expect(result.balance + 100 - result.creditForFuture).toBe(260);
  });
  test('2026 transfer settles 2025 debt without changing the original charge', () => {
    const events = [
      { id: 'stay:2025', delta: 80, isStay: true },
      { id: 'transfer:2026', delta: -120, isStay: false },
      { id: 'stay:2027', delta: 100, isStay: true },
    ];
    expect(getStaysPaidLater(events).has('stay:2025')).toBe(true);
    expect(getStaysPaidLater(events).has('stay:2027')).toBe(false);
    expect(events[0].delta).toBe(80);
  });
});