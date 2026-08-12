# Unify Split-Stay Creation Across Daily/Final Input and Stay History

## Goal
Make creating a split stay use the **same component and the same steps** on both the Daily & Final Input page (`CheckoutFinal.tsx`) and the Stay History page (`StayHistory.tsx`), and fix a cost-calculation discrepancy so both paths produce identical split amounts.

## Current state (verified by reading the code)

| Aspect | Daily & Final Input | Stay History |
|---|---|---|
| Entry | Inline "Split Costs" toggle on the page | "Edit Occupancy" button → dialog |
| Component | `GuestCostSplitDialog` (split-only) | `UnifiedOccupancyDialog` (Simple + Split tabs) |
| perDiem | `totalAmount / totalGuestNights` (gross charges, **correct**) | `reservation_settings.nightly_rate` (raw rate, **excludes fees**) |
| totalAmount passed | `enhancedBilling.total + previousCredit` | `payment.amount` (charges only) |
| Edge function | `create-split-payments` | `create-split-payments` (same) |

**Bug:** Stay History splits undercharge recipients because perDiem excludes cleaning/tax/deposit. This must be fixed as part of unification.

## Plan

### 1. Adopt `UnifiedOccupancyDialog` as the single split component
- Use `UnifiedOccupancyDialog` for split creation on **both** pages.
- Remove `GuestCostSplitDialog` from `CheckoutFinal.tsx` and delete the component file.
- CheckoutFinal keeps its inline **Simple Entry** (part of the active checkout billing display) but removes the inline **Split Costs** grid, the "Show User Selection" block, the "Review & Create Split" button, and all `splitMode`/`splitUsers`/`sourceDailyGuests` inline state.

### 2. Add a `defaultMode` prop to `UnifiedOccupancyDialog`
- New optional prop: `defaultMode?: "simple" | "split"` (defaults to `"simple"`).
- When CheckoutFinal opens the dialog for a split, pass `defaultMode="split"` so the user lands directly on the Split tab.
- StayHistory continues to default to `"simple"` (no change).

### 3. Fix the perDiem calculation in `UnifiedOccupancyDialog`
- Replace the `fetchBillingConfig` perDiem logic (currently `nightly_rate`) with the gross-charges formula used by `GuestCostSplitDialog`:
  ```ts
  perDiem = totalAmount / totalGuestNights   // totalAmount prop / sum of recorded guests
  ```
- Keep the `fetchBillingConfig` call only if other fields (cleaning, tax, etc.) are still needed for display; otherwise remove it.
- This makes Stay History splits include cleaning/tax/deposit, matching CheckoutFinal.

### 4. Pass the correct `totalAmount` from both pages
- **CheckoutFinal:** pass `enhancedBilling.total + previousCredit` (unchanged from current GuestCostSplitDialog usage).
- **StayHistory:** pass `stayData.billingAmount` (the payment's full charge amount). This already includes all fees, so no change needed — but verify the value is non-zero and not just the nightly rate.

### 5. Add the split button to `CheckoutFinal`
- In the "Daily Occupancy & Charges" card, add a **"Split Costs with Others"** button (next to or below the Simple Entry controls).
- Clicking it opens `UnifiedOccupancyDialog` with:
  - `defaultMode="split"`
  - `sourceUserId={user.id}`
  - `reservationId={currentReservation.id}`
  - `dailyBreakdown` and `totalAmount` from the current billing
  - `onSplitCreated` → refresh billing data (`refetch()`)
- Guard: button disabled if no current reservation or if `paymentCreated` is true.

### 6. Relabel the Stay History button
- Change "Edit Occupancy" → **"Edit/Split Occupancy"** on `StayHistory.tsx`.

### 7. Consistent button labels
| Page | Button text | Opens |
|---|---|---|
| Daily & Final Input | "Split Costs with Others" | `UnifiedOccupancyDialog` (split tab) |
| Stay History | "Edit/Split Occupancy" | `UnifiedOccupancyDialog` (simple tab, switch to split) |

The split flow inside the dialog is identical on both pages: pick people → assign daily guest counts → see cost breakdown → "Create Split for N people".

## Files to change
- `src/components/UnifiedOccupancyDialog.tsx` — add `defaultMode` prop, fix perDiem, keep/delete billing-config fetch as needed.
- `src/pages/CheckoutFinal.tsx` — remove inline split mode + `GuestCostSplitDialog`, add "Split Costs with Others" button + `UnifiedOccupancyDialog` instance.
- `src/pages/StayHistory.tsx` — relabel button to "Edit/Split Occupancy".
- `src/components/GuestCostSplitDialog.tsx` — delete (no longer referenced).

## What stays the same
- Inline Simple Entry on CheckoutFinal (editing daily guest counts during active checkout).
- The `create-split-payments` edge function (no backend change).
- StayHistory's "Edit/Split Occupancy" dialog still supports simple occupancy edits via the Simple tab.

## Verification
- Build passes (no dangling `GuestCostSplitDialog` imports).
- On CheckoutFinal: "Split Costs with Others" opens the dialog on the Split tab; creating a split calls `create-split-payments` and refreshes billing.
- On StayHistory: "Edit/Split Occupancy" opens the same dialog; a split produces the same perDiem as CheckoutFinal (gross charges / guest-nights).
- Confirm the split amount for a recipient matches between the two pages for the same stay.
