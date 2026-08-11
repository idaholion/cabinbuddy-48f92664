# Plan: Add a Save Split Button to the Daily & Final Input Page

## Goal
Make it possible for Debbie (or any user) to create a payment split directly from the **Daily & Final Input** page, using the guest counts she already entered, and keep the **Stay History** split flow consistent.

## Current State
- **Stay History** uses `UnifiedOccupancyDialog`, which has a working split creation flow and a save button.
- **Daily & Final Input** (`CheckoutFinal.tsx`) has an inline "Split Costs" mode where users can pick people and enter daily guest counts, but the only action button is **"Save Changes"**, which only saves occupancy. There is no button to create the actual payment split.
- `GuestCostSplitDialog.tsx` already contains the full split creation logic (validation + `create-split-payments` edge function call) and a "Create Split" button, but it is never opened from `CheckoutFinal.tsx`.

## Proposed Changes

### 1. Daily & Final Input page (`src/pages/CheckoutFinal.tsx`)
- In the inline "Split Costs" section, add a primary **"Review & Create Split"** button that appears once at least one split user has been selected and daily guest counts are valid.
- Clicking the button opens `GuestCostSplitDialog` with the current inline selections pre-populated:
  - selected users
  - source daily guest counts
  - recipient daily guest counts
- Reuse `GuestCostSplitDialog` for validation and the edge-function call so the logic is not duplicated.
- After a successful split creation, refresh payments/splits and keep the user on the page.

### 2. `GuestCostSplitDialog.tsx`
- Accept optional initial state props (`initialSelectedUsers`, `initialSourceDailyGuests`) so it can be opened from `CheckoutFinal` with values already filled in.
- When these props are provided, skip the default zero-initialization for those fields.
- Keep all existing validation and the "Create Split for N People" button.

### 3. Stay History page (`src/pages/StayHistory.tsx`)
- Ensure the `UnifiedOccupancyDialog` split flow uses the same clear button label and behavior as the Daily & Final Input flow.
- If the dialog already has a working create-split path, only adjust labels/messaging for consistency.

## Out of Scope
- No new database tables or edge functions are required; this reuses the existing `create-split-payments` edge function and `payment_splits` table.
- No changes to the split calculation math.

## Acceptance Criteria
- [ ] A user on the Daily & Final Input page can enter split guest counts and click a button to create the split payment.
- [ ] Guest counts already entered inline are preserved when the split dialog opens.
- [ ] After the split is created, the page refreshes and shows the new split.
- [ ] The Stay History split flow remains functional and uses consistent wording.
