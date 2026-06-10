## Goal

1. Let admins open the **Daily Checkout** (`/checkout-list`) and **Final Checkout** (`/checkout-final`) pages as if they were any other user, with full edit ability.
2. Investigate why the Cook account shows a **+$240 credit** on Stay History but **-$209.12 balance due** on the Checkout page, and document/fix the cause.

---

## Part 1 — Admin "View as user" mode

### UX

**Entry points (both):**
- **Dropdown at the top of each checkout page** (admin only): "Viewing as: [Self ▾]". Lists every member from every family group, grouped by family group. Selecting a member reloads the page in impersonation mode. A clear banner stays pinned at the top:
  > ⚠️ Admin View — Acting as **Jane Cook** (Cook family). Changes will be saved as this user. [Exit]
- **Launch link from Stay History rows**: a new "View checkout as user" action on each row that deep-links to `/checkout-list?viewAs=<user_id>` (or `/checkout-final?...`).

**Behavior:**
- Full edit. Saves write data as if performed by the target user (split costs, mark paid, billing adjustments, etc.).
- Every write performed while impersonating is tagged in an audit table so we can see "admin X acted as user Y on date Z".
- Non-admins never see the dropdown or banner; the `viewAs` param is ignored for them.

### Technical implementation

1. **Impersonation context**
   - New `ImpersonationContext` (React) holding `{ targetUserId, targetProfile, isImpersonating }`.
   - Wraps the app inside `AuthProvider`. Reads `?viewAs=` from URL on mount and validates admin via `useOrgAdmin`.
   - Exposes `useEffectiveUser()` returning either `user` (auth) or the impersonated profile. Components that currently call `useAuth().user` for data-scoping switch to `useEffectiveUser()`.

2. **Refactor checkout pages**
   - `src/pages/CheckoutList.tsx` and `src/pages/CheckoutFinal.tsx`: replace internal `user.id` references used for reservation/receipt filtering (lines around 137, 196, 261, 415, 457, 693 etc.) with `effectiveUser.id`. Auth-only operations (logout) keep `user`.
   - Add the "Viewing as" dropdown + banner at the top of both pages (admin-only).

3. **Member picker data**
   - Reuse `useFamilyGroups()` to populate the dropdown (grouped by `family_groups.name`, members from `host_members`).

4. **Stay History launch link**
   - In `src/pages/StayHistory.tsx` add an admin-only menu item per row: "Open Daily Checkout as user" and "Open Final Checkout as user", navigating with `?viewAs=<user_id>&reservationId=<id>`.

5. **Audit trail**
   - SQL (user runs in Supabase SQL editor — external Supabase):
     ```sql
     CREATE TABLE public.admin_impersonation_log (
       id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
       organization_id uuid NOT NULL,
       admin_user_id uuid NOT NULL,
       target_user_id uuid NOT NULL,
       action text NOT NULL,         -- e.g. 'split_save','mark_paid','adjust_billing'
       context jsonb,                -- payload summary
       created_at timestamptz DEFAULT now()
     );
     GRANT SELECT, INSERT ON public.admin_impersonation_log TO authenticated;
     GRANT ALL ON public.admin_impersonation_log TO service_role;
     ALTER TABLE public.admin_impersonation_log ENABLE ROW LEVEL SECURITY;
     CREATE POLICY "Admin read own org" ON public.admin_impersonation_log
       FOR SELECT TO authenticated USING (public.is_org_admin(auth.uid(), organization_id));
     CREATE POLICY "Admin insert own org" ON public.admin_impersonation_log
       FOR INSERT TO authenticated WITH CHECK (admin_user_id = auth.uid());
     ```
   - Frontend logs an entry on every save performed while impersonating.

6. **Safety**
   - Hard guard: impersonation context only activates if `useOrgAdmin().isAdmin === true`.
   - Banner uses a high-contrast warning color so admins can't forget they're acting as someone else.

---

## Part 2 — Cook account balance discrepancy

The mismatch (Stay History: +$240 credit vs. Checkout page: −$209.12 balance due) points to the checkout page computing its own balance from a different source than Stay History.

### Investigation steps (read-only, before code changes)

1. Query the Cook family's `payments`, `payment_splits`, and `reservations` for the relevant year:
   - Are there split records (recipient rows) without matching source-side credits, producing the −$209.12?
   - Compare `payments.amount`, `amount_paid`, `balance_due` (generated column) vs. the Stay History calculation.
2. Compare the calculation in `useCheckoutBilling.ts` vs. the Stay History logic. Likely root causes:
   - Stay History applies the **backward payment cascade** (overpayments rolled to prior unpaid stays) but the Checkout page doesn't.
   - Checkout sums only the current stay's `payments` row and ignores credits stored on prior stays.
   - Split-payment recipient rows being added as a positive balance without netting the source overpayment.

### Fix approach (after diagnosis confirms the cause)

- Update `useCheckoutBilling.ts` so the displayed "Balance due" matches the Stay-History-derived number for the same family/stay:
  - Reuse the Stay History calculator (or extract it into a shared util `lib/billing-balance.ts`) so both pages call one function.
  - Include credits/overpayments from prior stays for the same family.
  - Net split-payment offsets the same way Stay History does.
- Add a small test fixture reproducing Cook's situation (credit > current stay charge) to lock the behavior.

### Deliverable for Part 2
- A short written diagnosis (posted in chat after the read-only queries) confirming the cause for Cook.
- A code change that makes the Checkout page's balance match Stay History.

---

## Files expected to change

- `src/contexts/ImpersonationContext.tsx` (new)
- `src/App.tsx` (wrap with provider)
- `src/hooks/useEffectiveUser.ts` (new)
- `src/pages/CheckoutList.tsx`
- `src/pages/CheckoutFinal.tsx`
- `src/pages/StayHistory.tsx` (add launch link)
- `src/components/admin/ViewAsUserPicker.tsx` (new dropdown + banner)
- `src/hooks/useCheckoutBilling.ts` (Part 2 fix)
- `src/lib/billing-balance.ts` (new shared util, if extraction is needed)
- SQL script for `admin_impersonation_log` (user-run)

## Out of scope
- Changing Stay History's calculation logic.
- Impersonating across organizations.
- Server-side enforcement of impersonation (still gated by admin role + RLS; this is an in-app convenience).
