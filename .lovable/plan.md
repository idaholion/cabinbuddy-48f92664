

## Fix Checkout vs. Closing Checklist Conflict

### The Problem
The **Checkout Checklist** (post-stay cleanup, used after each visit) is stored in the database as `checklist_type: 'closing'`. This is the same type name that would be used for an actual **Closing Checklist** (shutting down the property at end of season). These are two different things and must not share a type.

### The Fix

**1. Introduce a new `checklist_type: 'checkout'` for the post-stay checklist**

Migrate the Checkout page (`src/pages/CheckoutList.tsx`) to use `checklist_type: 'checkout'` instead of `'closing'`, freeing up `'closing'` for its intended purpose (end-of-season shutdown).

- Update all 3 places in `CheckoutList.tsx` where `checklist_type: 'closing'` appears to use `'checkout'`
- Update `BackfillImages.tsx` which also references `'closing'` (confirm if it should target checkout, closing, or both)

**2. Database migration for existing data**

Run a one-time update to rename existing `'closing'` records to `'checkout'`, since all current `'closing'` rows were created by the Checkout page:

```sql
UPDATE custom_checklists SET checklist_type = 'checkout' WHERE checklist_type = 'closing';
```

**3. Update the Quick Checklist Creator type dropdown**

In `src/components/checklist/QuickChecklistCreator.tsx`, update the select options:
- Keep `"closing"` labeled as **"Closing (End of Season)"**
- Add `"checkout"` labeled as **"Checkout (Post-Stay Cleanup)"**

Updated dropdown options:
- Opening Checklist
- **Checkout (Post-Stay Cleanup)** -- new
- **Closing (End of Season)** -- clarified label
- Seasonal Tasks
- Maintenance
- Arrival Checklist
- Daily Tasks
- Custom Type...

**4. Add admin link on the Checkout page**

Add a small note for admins on `CheckoutList.tsx`: "Want to add photos to this checklist? Use the Checklist Creator." with a link to `/checklist-creator`. This bridges the quick-edit experience with the full creator.

**5. Ensure the Checklist Creator landing page shows checkout checklists properly**

In `src/pages/ChecklistCreator.tsx`, the existing checklists list already displays by `checklist_type` name. The `'checkout'` type will appear with a capitalized label automatically. May add a friendlier display name mapping (e.g., "Checkout (Post-Stay Cleanup)").

### Files to Modify
- `src/pages/CheckoutList.tsx` -- change `'closing'` to `'checkout'` (3 locations)
- `src/components/checklist/QuickChecklistCreator.tsx` -- update type dropdown
- `src/components/BackfillImages.tsx` -- update type reference
- `src/pages/ChecklistCreator.tsx` -- add friendly type label mapping
- New SQL migration to rename existing rows
- `src/pages/SeasonalChecklists.tsx` / `SeasonalChecklistView.tsx` -- verify type display labels handle both `checkout` and `closing` gracefully

### Data Safety
- Only 4 distinct types exist in the database currently: `arrival`, `closing`, `daily`, `opening`
- All `closing` records were created by the Checkout page, so renaming them to `checkout` is safe
- The Live environment will need the same SQL migration run before publishing

