# Other Payment Methods on the Daily & Final Input Page

## What changes

1. **Remove the redundant Venmo line**
   - The "Send Venmo payment to: @Andrew-Cabin" note under the selector goes away. That info already lives in the blue Venmo Pay Now box above.

2. **Rename the section**
   - "How will you pay?" becomes **"Other Payment Methods"**, positioned as the fallback for people not using the default Venmo flow.

3. **Drop Venmo from the dropdown**
   - Options become: **Check, Cash, PayPal, Other**.

4. **Method-specific inputs**
   - **Check** — Check number field + Amount paid by check. Keeps showing the payable-to name and mailing address from organization settings.
   - **Cash** — Amount paid in cash.
   - **PayPal** — Amount paid + optional transaction ID / PayPal email used, and it keeps showing the organization's PayPal address to send to. (See suggestion below.)
   - **Other** — Amount paid + a short free-text "How was this paid?" field.

5. **Button behavior**
   - The button becomes **"Record Payment"** when a method with an amount is selected.
   - It records the stay charge as before, but now also stores the amount entered as `amount_paid`, the method, and the check number / transaction ID / description in the payment reference and notes.
   - Status resolves automatically: paid when the amount covers the balance, partial when it is less, pending when no amount is entered.
   - Amount defaults to the balance due so the common case is one click; it stays editable for partial payments.

6. **Validation**
   - Must pick a method before recording.
   - Amount must be greater than zero and is rounded to 2 decimals.
   - Check number is optional but encouraged (no hard block).

## PayPal suggestion

PayPal is really the same shape as Venmo: an offline-recorded transfer to the organization's PayPal address. Recommendation is to treat it exactly like Cash but with the organization's PayPal email shown as the send-to target, plus one optional "PayPal transaction ID" field so the treasurer can reconcile against the PayPal statement. No live PayPal integration — that would need a merchant account and checkout redirect, which is out of scope here.

## Technical notes

- `src/pages/CheckoutFinal.tsx` — remove the Venmo instruction block under the selector, relabel the section, drop the `venmo` SelectItem, add state for `paymentAmount`, `checkNumber`, `paypalReference`, `otherDescription`, plus the conditional input groups. Default `paymentAmount` to the computed balance due.
- `src/hooks/useCheckoutBilling.ts` — `recordBalanceDue` gains optional `amountPaid` and `reference`/`note` params; writes `amount_paid`, `payment_reference`, `paid_date`, and derives `status` (`paid` / `partial` / `pending`). `balance_due` stays untouched (generated column).
- Split-participant recording (`createDeferredPaymentForUser` path) uses the same method/amount inputs for consistency.
- Default preferred-method effect no longer selects `venmo`; if the org's preferred method is Venmo, the selector starts empty.

## Out of scope
- Live PayPal or Stripe processing.
- Changes to the existing blue Venmo Pay Now box.
