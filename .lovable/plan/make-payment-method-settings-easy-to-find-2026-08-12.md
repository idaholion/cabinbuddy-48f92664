# Make Payment Method Settings Easy to Find

The editor already exists: **Setup → Use Fee Setup**, in a card titled "Payment Methods (Other Payment Options)" between the fee fields and Payment Settings. Changes save with the page's Save button into `reservation_settings.payment_methods_config`.

The problem is discoverability — it's buried mid-page with no path from the place you actually see the options.

## Proposed changes

1. **Admin shortcut in the dialog.** In the "Other Payment Options" payment dialog, show a small gear / "Manage payment options" link for admins only, linking to `/use-fee-setup#payment-methods`.
2. **Anchor and highlight.** Give the Payment Methods card an `id="payment-methods"` so the link scrolls straight to it and briefly highlights it.
3. **Setup page pointer.** Add a short line to the Use Fee Setup step description on the Setup page noting it also controls the payment methods members can choose.

## Technical notes

- Dialog: `src/components/RecordPaymentDialog.tsx` — gate the link on the existing admin check used elsewhere (organization admin), navigate with `react-router`.
- Card: `src/components/setup/PaymentMethodsConfig.tsx` — add `id` on the `Card`; `src/pages/UseFeeSetupPage.tsx` — scroll into view when the hash is present.
- No database or business-logic changes; presentation and navigation only.
