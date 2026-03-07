

## Rename "Manage Expenses" and Add Cabin Fund Expenses

### Problem
1. The tab labeled "Manage Expenses" is misleading — it primarily shows expenses reported by individual group members (receipts), not "management" functionality.
2. There's no way to record expenses paid directly from the cabin fund (e.g., maintenance costs, supply purchases) that aren't tied to an individual family group member. These "cabin fund expenses" offset cabin fees and should be tracked separately.

### Changes

**1. Rename the tab and descriptions**

In `src/pages/FinancialDashboard.tsx`:
- Rename "Manage Expenses" → "Member Expenses" (mobile: "Member")
- Update subtitle from "Add and manage cabin-related expenses" → "Expenses reported by group members"

**2. Add a new "Cabin Fund Expenses" tab**

In `src/pages/FinancialDashboard.tsx`:
- Add a new tab "Cabin Fund" between "Member Expenses" and "Recurring Bills"
- This tab renders a new `<CabinFundExpenses />` component

**3. New component: `src/components/CabinFundExpenses.tsx`**

This component allows admins/treasurers to record expenses paid from the shared cabin fund. Key differences from member receipts:
- **No family group required** — these are organization-level expenses
- **Category field** — categories like Maintenance, Supplies, Repairs, Improvements, Administrative, Other
- **Paid-by field** — optional text field for who paid (e.g., "Admin", "Contractor name")
- **Notes field** — free text for context
- Uses the existing `receipts` table but with `family_group` set to a special value like `"Cabin Fund"` and `user_id` set to the current user

Layout:
- Summary card showing total cabin fund expenses for the year
- Year selector
- Add expense form (admin/treasurer only)
- Filterable/sortable list of cabin fund expenses
- CSV export button

**4. Update ExpenseTracker labels**

In `src/components/ExpenseTracker.tsx`:
- Change card header from "Recent Expenses" → "Member-Reported Expenses"
- Update description to clarify these are individual member submissions
- Filter OUT any receipts where `family_group === 'Cabin Fund'` so they don't appear in both tabs

**No database changes needed** — the existing `receipts` table already supports this. Cabin fund expenses are just receipts with `family_group = 'Cabin Fund'` (or null) and a description that captures the category/notes.

### Tab Order After Changes
1. Member Expenses (was "Manage Expenses")
2. Cabin Fund
3. Recurring Bills
4. Historical Reports
5. Financial Reports

