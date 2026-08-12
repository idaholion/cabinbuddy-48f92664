# Payment Method Options: Admin Control + Remove Half Balance

## 1. Remove "Half Balance"

The Other Payment Options dialog (used on both Stay History and Daily & Final Input) keeps only the **Full Balance** shortcut next to the payment amount. The Half Balance button is removed everywhere the dialog appears.

## 2. Admin-configurable payment methods

A new **Payment Methods** section on the Use Fee Setup page lets an admin control the list users see in the "Select payment method" dropdown.

For each method (Check, Cash, Venmo, Zelle, PayPal, Bank Transfer, Credit Card, Other):

- **Enabled toggle** — off means the method does not appear in the dropdown at all.
- **Display label** — rename it (e.g. "Zelle (preferred)").
- **Instructions / account info** — free text shown to the user in the dialog when that method is selected (e.g. the Zelle phone/email, bank routing details, check payable-to and mailing address).
- **Reference field label** — what to call the confirmation-number field for that method (e.g. "Zelle Confirmation #").
- **Coming soon toggle** — the option still shows in the list but greyed out and unselectable, with a "not yet active" note. Useful for methods being set up.
- **Order** — drag-free up/down arrows to control the order they appear.

Adding a brand-new custom method (beyond the eight above) is also supported: a "Add payment method" button creates a custom entry with its own label and instructions; it is stored against the database's `other` payment type so existing reporting still works, with the custom label preserved in the payment reference.

Existing Venmo, PayPal, and check fields on the Use Fee Setup page keep working — they pre-fill the corresponding method's instructions the first time the config is created, so nothing is lost.

## 3. What users see

In the Other Payment Options dialog, the dropdown shows only enabled methods, in admin order, with admin labels. Selecting one shows its instructions block (same styling as the current check/PayPal blocks) and uses the admin's reference-field label. Greyed-out "coming soon" methods cannot be picked.

## Technical notes

- New `payment_methods_config` `jsonb` column on `reservation_settings`, defaulting to `null`. Shape: array of `{ key, label, enabled, comingSoon, instructions, referenceLabel, sortOrder, isCustom }`. Because this project uses an external Supabase, the SQL script will be provided for manual run in the SQL Editor.
- `src/hooks/useFinancialSettings.ts` — read/write `payment_methods_config`; expose a resolved list that falls back to the current hardcoded eight methods (with venmo/paypal/check instructions derived from existing fields) when the column is null.
- New `src/components/setup/PaymentMethodsConfig.tsx` — the admin editor; mounted in `src/pages/UseFeeSetupPage.tsx` under the payment section, saved through the existing save handler.
- `src/components/RecordPaymentDialog.tsx` — drop the Half Balance button; accept a `methods` prop (resolved config) and render the dropdown, per-method instructions, and reference label from it; keep the check-number field for the `check` key. Falls back to today's static list if no config is passed.
- `src/pages/StayHistory.tsx` and `src/pages/CheckoutFinal.tsx` — pass the resolved method config into the dialog.
- Non-enum method keys (zelle, credit_card, customs) continue to be stored as `other` with the label captured in the reference, matching current behavior.

## Out of scope

- Live payment processing (Stripe/PayPal checkout).
- Changing the blue Venmo Pay Now box.
