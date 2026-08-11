# Plan: Payment Method Choice on Daily & Final Input Page

## What changes

Replace the "Will pay by end of season" deferral concept with a simple **payment method choice** plus a plain **Balance Due** line. No more "deferred" language anywhere in the checkout flow.

## Behavior

1. **Payment method selector**
   - On the Daily & Final Input page, below the cost breakdown, add a "How will you pay?" selector with options: Venmo, PayPal, Check, Cash, Other.
   - Defaults to the organization's configured preferred payment method when one is set.
   - When Check is selected and the organization has configured a "Check payable to" name and mailing address, show those instructions inline. Same for PayPal email and Venmo handle.

2. **Record the balance**
   - The existing button (currently "Will pay by end of season") becomes a single **"Record Balance Due"** action.
   - It creates the same payment record it does today, but with `status: 'pending'` instead of `'deferred'`, and stores the chosen method in the `payment_method` column.
   - Confirmation message becomes "Balance Recorded — $X is now shown as your balance due (paying by Check)." instead of "Payment Deferred".

3. **Remove deferred indications**
   - Drop "Payment Deferred" toasts and "deferred to end of season" wording.
   - Any place showing a "Deferred" status badge for these records will show the normal balance-due presentation instead.
   - Existing rows already saved as `deferred` are treated the same as `pending` for display, so old records don't look broken.

4. **Venmo "Pay Now" button** stays as-is for people paying immediately.

## Technical notes

- `src/hooks/useCheckoutBilling.ts` — `createDeferredPayment` renamed to `recordBalanceDue`, accepts a payment method, writes `status: 'pending'` and `payment_method`, updated notes/toast text. Split payment creation (`createSplitPayment`) likewise switches from `deferred` to `pending`.
- `src/pages/CheckoutFinal.tsx` — new payment-method state and selector UI, button relabel, `handlePayLater` renamed and updated, `createDeferredPaymentForUser` passes the selected method for split participants.
- `src/pages/StayHistory.tsx` — treat `deferred` and `pending` identically in status display; show the payment method where a status badge previously said "Deferred".
- No database migration needed: `payments.payment_method` and the `pending` status already exist.

## Out of scope
- Processing real payments; all methods remain manual/offline records.
- Changing how balances cascade between stays.
