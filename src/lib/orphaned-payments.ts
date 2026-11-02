type PaymentCandidate = {
  id: string;
  reservation_id?: string | null;
  daily_occupancy?: unknown;
  notes?: string | null;
};

type SplitConnection = {
  source_payment_id?: string | null;
  split_payment_id?: string | null;
};

/** Split payments are deliberately unlinked from reservations, not orphaned. */
export function countOrphanedPayments(
  payments: readonly PaymentCandidate[],
  splits: readonly SplitConnection[],
): number {
  const connectedIds = new Set<string>();
  for (const split of splits) {
    if (split.source_payment_id) connectedIds.add(split.source_payment_id);
    if (split.split_payment_id) connectedIds.add(split.split_payment_id);
  }
  return payments.filter(payment =>
    payment.reservation_id === null &&
    Array.isArray(payment.daily_occupancy) &&
    payment.daily_occupancy.length > 0 &&
    !connectedIds.has(payment.id) &&
    !payment.notes?.toLowerCase().includes('split from')
  ).length;
}