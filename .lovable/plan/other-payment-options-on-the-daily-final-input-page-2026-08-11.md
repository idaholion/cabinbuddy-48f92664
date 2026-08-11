# Other Payment Options on the Daily & Final Input Page

## What changes

Match the Daily & Final Input page to the Stay History payment experience so the two pages behave the same way.

1. **Remove the redundant line and the inline selector**
   - The "Send Venmo payment to: @Andrew-Cabin" note goes away — that info is already in the blue Venmo box.
   - The inline "How will you pay?" dropdown and the "Record Balance Due" button are removed from the cost breakdown.

2. **Add an "Other Payment Options" button directly below the blue Venmo box**
   - Clicking it opens the same dialog style used by "Record Payment" in Stay History, titled **Other Payment Options**.

3. **Dialog contents (same as Stay History)**
   - Balance Due shown at top.
   - Payment Amount, prefilled with the balance due, with Full Balance / Half Balance shortcuts.
   - Payment Date, defaulting to today.
   - Payment Method dropdown using the Stay History list: Check, Cash, Venmo, Zelle, PayPal, Bank Transfer, Credit Card, Other.
   - Check selected adds a Check Number field.
   - Reference field whose label adapts to the method (Venmo transaction ID, Zelle confirmation #, etc.).
   - Notes field.
   - Save button reads **Record Payment**.

4. **What saving does here**
   - On Stay History the dialog updates an existing payment row. On the Daily & Final Input page a payment row may not exist yet, so saving will create the stay's payment record (charges, daily occupancy, due date) and immediately apply the entered amount, method, reference, and date to it. If a row already exists for the stay, the amount is added to it instead of creating a duplicate.
   - Status is derived automatically: paid when the amount covers the charge, partial when less, pending when nothing was recorded. No "deferred" wording anywhere.

5. **Balance-only case**
   - If someone just wants the balance on the books without paying yet, they can close the dialog — the stay's balance already appears as Balance Due in the cost breakdown, so no separate button is needed.

## PayPal answer

PayPal is best handled exactly like Venmo and Zelle: an offline transfer recorded after the fact. The dialog shows the organization's PayPal email as the send-to address when PayPal is chosen, and the reference field becomes "PayPal Transaction ID" so the treasurer can reconcile against the PayPal statement. A live PayPal checkout would require a merchant account and redirect flow — not recommended for this use.

## One thing to confirm

The Stay History list includes **Zelle** and **Credit Card**, but the database's payment-method values are limited to cash, check, venmo, paypal, bank_transfer, stripe, and other. Zelle and Credit Card would be stored as "other" with the method name kept in the notes/reference, unless a small SQL change is run to add them as real values. Default approach is the store-as-other fallback; say the word and a migration script can be provided instead.

## Technical notes

- `src/components/RecordPaymentDialog.tsx` — accept an optional title override and optional payment instructions block (check payable-to/address, PayPal email) so it can be reused unchanged elsewhere.
- `src/pages/CheckoutFinal.tsx` — delete the inline payment-method Select, the Venmo instruction line, and the "Record Balance Due" button; add an "Other Payment Options" button under the Venmo card that opens `RecordPaymentDialog` seeded with the current balance due; on save, call a new handler that creates-or-updates the stay payment row.
- `src/hooks/useCheckoutBilling.ts` — `recordBalanceDue` gains optional `amountPaid`, `paidDate`, `paymentReference`, and `notes`; writes `amount_paid`, `payment_method`, `payment_reference`, `paid_date`, and derives `status`. `balance_due` remains untouched (generated column).
- Method values outside the DB enum map to `other`, with the original label preserved in the reference/notes text.
- Split-participant recording uses the same dialog and handler for consistency.

## Out of scope
- Live PayPal, Stripe, or card processing.
- Changes to the blue Venmo Pay Now box itself.
