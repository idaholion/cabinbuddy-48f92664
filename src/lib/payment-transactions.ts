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

export async function listPaymentLines(paymentIds: string | string[]): Promise<PaymentLine[] | null> {
  const ids = Array.isArray(paymentIds) ? paymentIds : [paymentIds];
  if (ids.length === 0) return [];
  const { data, error } = await table().select("*").in("payment_id", ids).order("paid_date", { ascending: false }).order("created_at", { ascending: false });
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

/** One stay's payment record within a family's payment history. */
export interface FamilyStayPayment {
  paymentId: string;
  amount: number;
  amountPaid: number;
  reservationId: string | null;
  /** e.g. "Oct 9–15, 2026", or "No stay linked" */
  stayLabel: string;
  /** Year used for filtering: stay start year, else payment year. */
  year: number | null;
}

/**
 * Lists every payment record a family group has, newest stay first, so the
 * Payment History dialog can show more than one stay at a time.
 */
export async function listFamilyStayPayments(organizationId: string, familyGroup: string): Promise<FamilyStayPayment[]> {
  const { data: pays, error } = await (supabase as any)
    .from("payments")
    .select("id, amount, amount_paid, reservation_id, paid_date, created_at")
    .eq("organization_id", organizationId)
    .eq("family_group", familyGroup)
    .order("created_at", { ascending: false });
  if (error) throw error;

  const reservationIds = Array.from(new Set((pays || []).map((p: any) => p.reservation_id).filter(Boolean)));
  const stayById = new Map<string, { start_date: string; end_date: string }>();
  if (reservationIds.length > 0) {
    const { data: reservations, error: resError } = await (supabase as any)
      .from("reservations")
      .select("id, start_date, end_date")
      .in("id", reservationIds);
    if (resError) throw resError;
    for (const r of reservations || []) stayById.set(r.id, r);
  }

  return (pays || []).map((p: any) => {
    const stay = p.reservation_id ? stayById.get(p.reservation_id) : undefined;
    const dateSource = stay?.start_date || p.paid_date || p.created_at;
    const year = dateSource ? new Date(dateSource).getFullYear() : null;
    const stayLabel = stay
      ? `${formatShort(stay.start_date)} – ${formatShort(stay.end_date)}`
      : "No stay linked";
    return {
      paymentId: p.id,
      amount: Number(p.amount) || 0,
      amountPaid: Number(p.amount_paid) || 0,
      reservationId: p.reservation_id,
      stayLabel,
      year,
    };
  });
}

const formatShort = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};
