# Fix Split Cost Calculation Consistency Across Both Pages

## Goal
Make split-stay amounts calculate identically whether the split is created from the Daily & Final Input page or the Stay History page. Keep each page's existing UI layout (inline on Daily & Final Input, modal on Stay History) and improve discoverability of the Stay History split option.

## The problem (verified in the code)

Both pages call the same `create-split-payments` edge function and both already show a cost preview, but they compute the per-guest-night rate differently:

| | Daily & Final Input | Stay History |
|---|---|---|
| Component | `GuestCostSplitDialog` | `UnifiedOccupancyDialog` |
| perDiem formula | `totalAmount / totalGuestNights` | `reservation_settings.nightly_rate` |
| Includes cleaning/tax/deposit? | Yes | **No** |
| `totalAmount` passed in | `enhancedBilling.total + previousCredit` | `stayData.billingAmount` |

Two consequences:

1. **Stay History undercharges recipients.** Because perDiem is the raw nightly rate, cleaning fees, tax, and the damage deposit are never distributed across guest-nights. A recipient pays only their share of the base rate.
2. **The two pages can produce different amounts for the same stay** even after the formula is fixed, because the `totalAmount` inputs differ.

## Plan

### 1. Fix perDiem in `UnifiedOccupancyDialog`
Replace the `nightly_rate`-based perDiem with the same gross-charges formula the other dialog uses:

```ts
const totalGuestNights = fullStayOccupancy.reduce((sum, d) => sum + (d.guests || 0), 0);
const perDiem = totalGuestNights > 0 ? totalAmount / totalGuestNights : 0;
```

- Derive this inside the existing `useMemo` that already computes `sourceTotal` and `calculatedUsers`, so it recalculates when guest counts change.
- Remove the `perDiem` state variable and the perDiem assignment inside `fetchBillingConfig`.
- Keep `fetchBillingConfig` only if `billingConfig` is still consumed elsewhere in the component; if it is unused after this change, remove the state, the fetch, and its `useEffect` trigger.

### 2. Align the `totalAmount` inputs
- **Daily & Final Input** already passes gross stay charges (`enhancedBilling.total + previousCredit`). No change.
- **Stay History** passes `stayData.billingAmount`, which is the payment's `amount` field — the full charge for the stay including fees. Confirm during implementation that this value is the full charge and not a base-rate-only figure; if a manual adjustment exists, include `stayData.manualAdjustment` so the split is based on the true total charge.

### 3. Guard against a zero or missing total
If `totalAmount` is 0 or `totalGuestNights` is 0, perDiem becomes 0 and every recipient's share computes to $0 — which the existing validation rejects with a confusing "Each selected person must have at least some guest count assigned" message.

Add an explicit check in the Split tab: when perDiem resolves to 0, show an inline warning ("Stay charges are not available for this stay, so costs cannot be split") and disable the create-split button.

### 4. Relabel the Stay History button
Change `Edit Occupancy` to **`Edit/Split Occupancy`** so members can tell that splits can be created from this page. The dialog title stays as is.

## Files to change
- `src/components/UnifiedOccupancyDialog.tsx` — perDiem formula, remove unused billing-config perDiem logic, add the zero-total guard.
- `src/pages/StayHistory.tsx` — button label, and include `manualAdjustment` in the `totalAmount` passed to the dialog if applicable.

## What stays the same
- The Daily & Final Input page keeps its inline split grid, user selection, cost preview, and "Review & Create Split" button.
- The Stay History page keeps the modal with Simple Entry and Split Costs tabs, including its existing cost summary preview.
- `GuestCostSplitDialog` stays in place, unchanged.
- The `create-split-payments` edge function is unchanged.

## Verification
- Open the same past stay from both pages and configure an identical split (same people, same daily guest counts). The per-person dollar amounts in each page's preview should match.
- Confirm a Stay History split now includes the cleaning fee, tax, and deposit share rather than only the nightly rate.
- Confirm a stay with no payment record shows the new warning instead of silently producing $0 shares.
- Confirm Simple Entry occupancy editing on Stay History still saves correctly.
