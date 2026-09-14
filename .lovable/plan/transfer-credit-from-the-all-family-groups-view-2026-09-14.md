# Transfer Credit from the "All Family Groups" view

## Today

On Stay History, the **Transfer Credit** button lives only inside the "Credit Remaining / Current Balance" card, and that card is hidden whenever the family-group filter is **All Family Groups** (it was hidden on purpose, because one family's credit and another family's debt shouldn't be netted into a single figure).

The family-group selector — including the **All Family Groups** option — is already visible only to admins.

Result: an admin has to switch to each family group one at a time to move someone's credit, even though the page already knows every person who holds credit when "All Family Groups" is selected.

## What changes

1. **New card on the "All Family Groups" view: "Credit Available to Transfer."**
   Shows the total credit held across all members (a sum of positive credits only — never netted against anyone's unpaid charges), with a small line underneath such as "Held by 4 members." Appears only when at least one person the viewer may act for has credit.

2. **Transfer Credit button on that card.**
   Opens the existing dialog with no pre-selected source, so the "From" dropdown lists every member with credit (each already showing their available amount). Visible to admins across the whole organization; a group lead sees it too when the group-lead transfer switch is on, limited to their own group's members.

3. **Unpaid charges stay separate.**
   The "Charges Still Unpaid" card is untouched. A negative or zero combined balance no longer blocks the transfer option — availability is driven purely by whether anyone holds credit.

4. **Single-group view unchanged.**
   Selecting one family group keeps the current "Credit Remaining / Current Balance" card and its button exactly as they are.

## Technical notes

- `src/pages/StayHistory.tsx` only. `hostCreditMap` is already built from the unfiltered ledger and holds one positive credit per person, and `transferableCreditKeys` already applies the admin / lead / self permission rule — both work as-is on the "all" view.
- Add `const totalTransferableCredit = transferableCreditKeys.reduce((s, k) => s + (hostCreditMap.get(k) || 0), 0);`
- Render a new card in the summary grid gated on `selectedFamilyGroup === 'all' && transferableCreditKeys.length > 0`, using the same `onClick` logic as the existing card's button (admins/leads → `setTransferDialogSourceKey(null)`).
- The existing card keeps its `selectedFamilyGroup !== 'all'` guard. No dialog, hook, or database changes.
