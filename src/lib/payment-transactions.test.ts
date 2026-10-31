import { describe, expect, test, mock } from "bun:test";

mock.module("@/integrations/supabase/client", () => ({ supabase: {} }));
const { isOverpayment } = await import("./payment-transactions");

describe("overpayment warning", () => {
  test("paying exactly the balance is not an overpayment", () => {
    expect(isOverpayment(458.53, 458.53)).toBe(false);
  });
  test("paying more than the balance warns", () => {
    expect(isOverpayment(848.53, 458.53)).toBe(true);
  });
  test("any payment on an already-paid stay warns", () => {
    expect(isOverpayment(458.53, 0)).toBe(true);
    expect(isOverpayment(10, -50)).toBe(true);
  });
});
