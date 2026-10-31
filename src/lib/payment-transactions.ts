import { supabase } from "@/integrations/supabase/client";

/** One dated payment line recorded against a stay's payment record. */
export interface PaymentLine {
  id: string;
  payment_id: string;
  organization_id: string;
  amount: number;
  paid_date: string;
  payment_method: string | null;
  payment_reference: string | null;
  notes: string | null;
  is_backfill: boolean;
  created_at: string;
  updated_at: string;
}

export interface PaymentLineInput {
  amount: number;
  paidDate: string;
  paymentMethod?: string | null;
  paymentReference?: string | null;
  notes?: string | null;
}

// Table is newer than the generated types.
const table = () => (supabase as any).from("payment_transactions");

const isMissingTable = (error: any) =>
  !!error && (error.code === "42P01" || error.code === "PGRST205" || /payment_transactions/.test(error.message || ""));

const round2 = (v: number) => Math.round(v * 100) / 100;

/**
 * Records a payment as its own line. The database keeps the stay's paid total
 * in sync. Returns false when payment lines aren't installed yet, so callers
 * can fall back to the older combined-total update.
 */
export async function addPaymentLine(paymentId: string, organizationId: string, input: PaymentLineInput): Promise<boolean> {
  const { error } = await table().insert({
    payment_id: paymentId,
    organization_id: organizationId,
    amount: round2(input.amount),
    paid_date: input.paidDate,
    payment_method: input.paymentMethod || null,
    payment_reference: input.paymentReference || null,
    notes: input.notes || null,
  });
  if (error) {
    if (isMissingTable(error)) return false;
    throw error;
  }
  return true;
}

export async function listPaymentLines(paymentId: string): Promise<PaymentLine[] | null> {
  const { data, error } = await table().select("*").eq("payment_id", paymentId).order("paid_date", { ascending: true }).order("created_at", { ascending: true });
  if (error) {
    if (isMissingTable(error)) return null;
    throw error;
  }
  return (data || []) as PaymentLine[];
}

export async function updatePaymentLine(id: string, input: PaymentLineInput) {
  const { error } = await table()
    .update({
      amount: round2(input.amount),
      paid_date: input.paidDate,
      payment_method: input.paymentMethod || null,
      payment_reference: input.paymentReference || null,
      notes: input.notes || null,
    })
    .eq("id", id);
  if (error) throw error;
}

export async function deletePaymentLine(id: string) {
  const { error } = await table().delete().eq("id", id);
  if (error) throw error;
}

/** True when a new payment would exceed what is still owed on the stay. */
export function isOverpayment(amount: number, balanceDue: number): boolean {
  return round2(amount) > round2(Math.max(balanceDue, 0)) + 0.009;
}
