## Stay History: Simple Chronological Ledger

**Goal:** Every stay card reads like a running ledger line. Year filter is display-only; math is always global. Receipts attach by date, not by "newest in group".

### Changes in `src/pages/StayHistory.tsx`

1. **Separate cascade input from display filter.** Build the financial cascade from all permission/family-filtered reservations. Drop the `matchesYear` check from the cascade input (~lines 306, 381). Apply `selectedYear` only at render time, right before mapping cards.

2. **Attribute receipts by date (chronological walk).** Replace the `familyGroupsWithReceipts` / `isNewestInGroup` block (~lines 393, 561–574). For each family group, walk stays in date order: a receipt attaches to the first stay whose end date is on/after the receipt's date. Receipts dated after the last completed stay attach to that final stay as "Receipts received since last stay".

3. **Remove overpayment split logic.** Delete `creditFromEarlierPayment` distribution (~lines 720–770) and the "Applied to next stay / Rolled forward as credit" UI rows (~lines 1336–1380). Each stay produces one signed New Balance that becomes the next stay's Previous Balance.

4. **Unified card layout** for every stay:
   ```text
   Previous Balance:                 −$70.00   (or $0.00 for first stay)
   Charges (X nights):                $30.00
   Payments (cash/check/venmo):        $0.00
   Receipts Credited (N):              $0.00
   ─────────────────────────────────────────
   New Balance:                      −$40.00   (green "Credit" / red "Balance Due")
   ```

5. **Year-end summary row** injected between year blocks in the rendered list:
   ```text
   2025 Year-End Balance: −$40.00 credit — rolling forward to 2026
   ```
   The next year's first stay renders that same value as its Previous Balance, so the two rows tie visibly. Default action is roll-forward (no refund UI action added in this pass — display only).

6. **Bottom-of-list "Current Balance" card** — the last rendered row gets a highlighted "Current Balance" label instead of "New Balance", so the running total is clearly at the bottom.

### Out of scope
- No changes to `useCheckoutBilling`, CheckoutFinal, or the underlying `payments`/`receipts` tables.
- No refund workflow — year-end balance is display-only and always rolls forward.
