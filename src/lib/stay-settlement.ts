/** Oldest debt is settled first; later charges never reopen a settled stay. */
export function getStaysPaidLater(
  events: readonly { id: string; delta: number; isStay: boolean }[],
): Set<string> {
  const cents = (amount: number) => Math.round(amount * 100);
  const totalCoverage = events.reduce((sum, event) => sum + Math.max(0, -cents(event.delta)), 0);
  let charges = 0;
  let coverage = 0;
  const settled = new Set<string>();
  for (const event of events) {
    const delta = cents(event.delta);
    charges += Math.max(0, delta);
    coverage += Math.max(0, -delta);
    if (event.isStay && charges > coverage && totalCoverage >= charges) {
      settled.add(event.id);
    }
  }
  return settled;
}