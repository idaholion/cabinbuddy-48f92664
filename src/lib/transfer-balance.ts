/** Transfers settle existing debt; only the unused portion becomes forward credit. */
export function applyTransferToBalance(balance: number, amount: number) {
  const balanceCents = Math.round(balance * 100);
  const amountCents = Math.max(0, Math.round(amount * 100));
  const appliedCents = Math.min(Math.max(0, balanceCents), amountCents);
  return {
    balance: (balanceCents - amountCents) / 100,
    appliedToDebt: appliedCents / 100,
    creditForFuture: (amountCents - appliedCents) / 100,
  };
}