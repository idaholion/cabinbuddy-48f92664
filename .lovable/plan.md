# Stay History summary: charges, payments by method, and credit sources

## Problem
The Stay History summary cards show **Total Stays**, **Total Nights**, **Total Paid**, and **Current Balance**, but they do not clearly answer:
- What were the total charges for the selected period?
- How much was paid by each method (Venmo, check, etc.)?
- How much came from receipt credits?
- If there is a credit remaining, where did it come from (receipts vs. overpayment)?

## Root cause / data limitation found
The `payments` table stores only one cumulative `amount_paid` and one `payment_method` per stay. When a second payment is recorded, the code adds to `amount_paid` and updates `payment_method`. That means a reliable historical "paid by Venmo / paid by check" total across all stays does not exist today without a new source-of-truth table.

## Recommended approach

### Phase 1 — Immediate clarity in Stay History (no DB change)
Update the summary cards on `/stay-history` to reflect the selected year / family filter:
- **Total Stays** (existing)
- **Total Nights** (existing)
- **Total Charges** — `SUM(billingAmount + manualAdjustment)` of visible stays
- **Total Paid** — `SUM(amountPaid)` of visible stays, shown as one number; per-stay method detail remains in the existing Payment Details dialog
- **Receipts Credited** — `SUM(receiptsTotal)` of visible stays
- **Credit Remaining** — negative running balance, green, labeled "Credit Remaining" instead of "Balance" when it is a credit

In the per-stay financial summary keep the existing lines and make the bottom line read:
- "New Balance" for past stays
- "Current Balance" or "Credit Remaining" for the most recent stay

Improve the existing **Payment Details** dialog so it also shows:
- Receipt credits applied to that stay
- The running ledger balance after the stay

### Phase 2 — Accurate payment-method totals (DB change)
To make the "Total Paid by Venmo, Check, etc." breakdown correct across history, add a `payment_transactions` table and record each payment there instead of only updating `payments.amount_paid`.

Migration outline:

```sql
create table public.payment_transactions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade not null,
  payment_id uuid references public.payments(id) on delete cascade not null,
  amount numeric(10,2) not null,
  payment_method public.payment_method not null,
  paid_date date,
  payment_reference text,
  notes text,
  created_by_user_id uuid references auth.users(id),
  created_at timestamp with time zone default now()
);

grant select, insert on public.payment_transactions to authenticated;
grant all on public.payment_transactions to service_role;

alter table public.payment_transactions enable row level security;

create policy "Users can view their organization's payment transactions"
  on public.payment_transactions for select
  to authenticated
  using (organization_id in (
    select organization_id from public.user_organizations where user_id = auth.uid()
  ));

create policy "Users can insert their organization's payment transactions"
  on public.payment_transactions for insert
  to authenticated
  with check (organization_id in (
    select organization_id from public.user_organizations where user_id = auth.uid()
  ));
```

Then:
- Change the record-payment flows in `StayHistory.tsx`, `CheckoutFinal.tsx`, and `usePayments.ts` to insert a `payment_transactions` row and update `payments.amount_paid` as a derived total.
- Backfill: create one transaction per existing `payments` row with `amount_paid > 0`, using the current `payment_method`.
- Update the Stay History summary to aggregate methods from `payment_transactions`, grouped by `payment_method`.

## Files likely to change
- `src/pages/StayHistory.tsx` — summary cards, per-stay totals, transaction aggregation after Phase 2
- `src/components/PaymentHistoryDialog.tsx` — show receipt credits and running balance
- `src/hooks/usePayments.ts` — insert transactions, backfill helper
- `src/pages/CheckoutFinal.tsx` — insert transactions
- New Supabase migration for `payment_transactions`

## Decision needed
Phase 1 can be done now and makes the page much clearer without changing any data model. Phase 2 is the correct long-term fix for an accurate "paid by Venmo / check / etc." total, but it changes how payments are stored and requires the migration above to be run manually in the Supabase SQL Editor.

Do you want Phase 1 now and defer Phase 2, or implement both together?
