# Recording Venmo payments made outside CabinBuddy

Pete sent $900 by Venmo on his own. Today the only Venmo path is the "Pay Now" button, and Venmo is deliberately hidden from "Other Payment Options" — so there is no way to record a payment already sent, and the only visible button would send him to Venmo again.

## What changes

**1. Venmo becomes a recordable method for money already sent**

In "Other Payment Options", Venmo reappears, labeled clearly as a payment already sent:

- Method name: "Venmo (already sent)"
- Helper line: "Use this only if you already sent the money in Venmo. It will not charge you again."
- Venmo Transaction ID / note field stays available so the payment can be matched later.

Nothing about how payments are calculated changes — it records the same way check or cash does, and the balance updates immediately. The saved record notes that it was self-reported, so it is identifiable in payment history.

**2. A quick check before "Pay Now" opens Venmo**

Tapping Pay Now first shows a short prompt:

> Have you already sent this payment in Venmo?
> [No — open Venmo]  [Yes — record the payment I already sent]

"Yes" skips Venmo entirely and opens the record-payment form with Venmo preselected and the amount filled in. "No" behaves exactly as today: opens Venmo, then asks "Did you complete your payment?" so it gets recorded.

**3. Wording on the payment card**

Under the Pay Now button, a small line: "Already paid outside CabinBuddy? Record it instead." linking to the same record form.

## Pete's case

Once this is in, Pete (or you on his behalf) opens his stay, chooses Other Payment Options, picks Venmo (already sent), enters $900, the date, and the Venmo transaction ID. His balance drops by $900 and the entry appears in his Stay History like any other payment.

## Technical notes

- `src/components/RecordPaymentDialog.tsx`: replace the blanket `hideVenmo` behavior with a `venmoAlreadySentOnly` mode that keeps Venmo in the list under the "already sent" label with the explanatory helper text, and accepts an optional preselected method.
- `src/lib/payment-methods.ts`: add the alternate label/instructions for the Venmo option in "already sent" context; the DB value stays `venmo`.
- `src/pages/StayHistory.tsx`: add the pre-Venmo confirm dialog in front of the existing `venmoConfirmStay` flow, add the helper link under Pay Now, and pass the preselect flag when the user says "already sent".
- `src/pages/CheckoutFinal.tsx`: same two changes on the Daily & Final Input Venmo card so both pages behave identically.
- No database or schema changes; payment amounts, balances, and credit logic untouched.
