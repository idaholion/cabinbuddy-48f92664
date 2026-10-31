import { describe, expect, test } from 'bun:test';
import { getStaysPaidLater } from './stay-settlement';

const stay = (id: string, delta: number) => ({ id, delta, isStay: true });

describe('carried-forward stay settlement', () => {
  test('a later payment settles the original $930 balance without rewriting it', () => {
    const events = [stay('earlier', 930), stay('later', 140 - 848.53 - 221.47)];
    expect(getStaysPaidLater(events).has('earlier')).toBe(true);
    expect(events[0].delta).toBe(930);
  });
  test('partial later payment leaves the original balance unpaid', () => {
    expect(getStaysPaidLater([stay('earlier', 930), stay('later', -929.99)]).has('earlier')).toBe(false);
  });
  test('new debt does not reopen a previously settled stay', () => {
    const settled = getStaysPaidLater([stay('earlier', 930), stay('paid', -930), stay('new', 140)]);
    expect(settled.has('earlier')).toBe(true);
    expect(settled.has('new')).toBe(false);
  });
  test('later debt is not treated as settled just because older debt was paid', () => {
    const settled = getStaysPaidLater([stay('earlier', 930), stay('new', 140), stay('payment', -930)]);
    expect(settled.has('earlier')).toBe(true);
    expect(settled.has('new')).toBe(false);
  });
  test('another person’s payment cannot settle this person’s ledger', () => {
    expect(getStaysPaidLater([stay('dana', 930)]).has('dana')).toBe(false);
    expect(getStaysPaidLater([stay('other', -930)]).has('dana')).toBe(false);
  });
  test('credit already held is not labeled as a later settlement', () => {
    expect(getStaysPaidLater([stay('credit', -1000), stay('covered', 930)]).size).toBe(0);
  });
});