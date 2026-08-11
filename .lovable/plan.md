# Plan: Add Payment-Method Choice to Daily & Final Input Page

## Problem
The Daily & Final Input page currently offers two actions:
- **"Pay Now"** (Venmo link)
- **"Will pay by end of season"** (creates a deferred `payments` row)

There is no way for a family member to indicate they intend to pay by check, cash, PayPal, or another method. The `payments` table has a `payment_method` column, but the checkout flow never writes to it for deferred payments.

## Goal
Let the user choose and record their intended payment method on the Daily & Final Input page, and update the deferral button label so it clearly represents that choice.

## Implementation

1. **Add a payment-method selector to the deferral flow**
   - When the user clicks the deferral button, present a small dialog or inline selector with options: Venmo, PayPal, Check, Cash, Other.
   - Pre-select the organization's configured `preferred_payment_method` if available.

2. **Record the selected method in the database**
   - Update `createDeferredPayment` in `src/hooks/useCheckoutBilling.ts` and `createDeferredPaymentForUser` in `src/pages/CheckoutFinal.tsx` to accept a `paymentMethod` argument and write it to the `payment_method` column of the new `payments` row.

3. **Update the deferral button label**
   - Change "Will pay by end of season" to "Pay by check / other method" (or similar wording) so it no longer sounds like the only option is end-of-season deferral.

4. **Show payment-method details on the summary**
   - If the organization has configured check payable-to / mailing address, PayPal email, or Venmo handle, display the relevant instructions after the user selects that method.
   - On the post-deferral confirmation, show the recorded method (e.g., "Payment recorded: Check").

5. **Stay History visibility (optional but recommended)**
   - Ensure the recorded `payment_method` is visible on the Stay History page for the corresponding stay, so admins and members can see how the payment is expected to be made.

## Files likely touched
- `src/pages/CheckoutFinal.tsx`
- `src/hooks/useCheckoutBilling.ts`
- `src/pages/StayHistory.tsx` (display only)
- `src/integrations/supabase/types.ts` (if enum values need verification)

## Out of scope
- Actually processing payments (this remains manual/offline).
- Changing the existing Venmo "Pay Now" button behavior.
