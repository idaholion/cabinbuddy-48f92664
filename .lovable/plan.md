# Hide aggregate "Credit Remaining" on All Family Groups view

## Problem
On the Stay History page, when **All Family Groups** is selected the summary includes both **Charges Still Unpaid** (debt from some families) and **Credit Remaining** (credit from others). Those two values cannot cancel each other out because the credit belongs to one family and the debt to another, so showing the combined "Credit Remaining" figure is confusing.

## Goal
Remove the "Credit Remaining / Current Balance" summary card only when the family-group filter is set to **All Family Groups**. Keep it visible when a single family group is selected.

## Plan

1. **Update `src/pages/StayHistory.tsx`**
   - Wrap the final summary card (the one that renders "Credit Remaining" or "Current Balance") in a conditional so it only renders when `selectedFamilyGroup !== "all"`.
   - Adjust the surrounding `className` / grid layout if needed so the remaining cards still lay out cleanly when one card is absent.
   - Leave all other summary cards (`Total Stays`, `Guest Nights`, `Total Charges`, `Total Charges Paid-via Venmo, check, cash etc`, `Receipts Credited`, conditional `Charges Paid from Earlier Credit`, conditional `Charges Still Unpaid`) unchanged.

2. **Verify build**
   - Run the standard build/type-check flow to ensure no TypeScript errors.

## Out of scope
No database or calculation changes. The per-stay list and per-family-group balance behavior remain exactly as they are today.
