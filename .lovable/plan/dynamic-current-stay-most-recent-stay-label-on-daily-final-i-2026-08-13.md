# Dynamic "Current Stay" / "Most Recent Stay" label on Daily & Final Input

## Goal
Add a short qualifier next to "Daily Occupancy & Charges" on the Daily and Final Input page so users (and admins in View-as-user mode) can tell at a glance whether the stay being shown is in-progress or in the past.

- While the stay is actively occurring (today is between start and end date): **"— Current Stay"**
- After the stay has ended: **"— Most Recent Stay"**

## Change
Single edit in `src/pages/CheckoutFinal.tsx`:

1. Derive an `isCurrentStay` boolean near where `currentReservation` is computed (line ~244). Reuse the same active-stay test already used inside `getCurrentUserReservation`:
   ```ts
   const today = new Date(); today.setHours(0,0,0,0);
   const isCurrentStay = (() => {
     if (!currentReservation) return false;
     const start = parseDateOnly(currentReservation.start_date);
     const end = parseDateOnly(currentReservation.end_date);
     return today >= start && today <= end;
   })();
   ```
2. Append the label to the `CardTitle` (line ~1313), right after the "Daily Occupancy & Charges" text:
   ```tsx
   Daily Occupancy & Charges
   <span className="text-muted-foreground font-normal">
     — {isCurrentStay ? "Current Stay" : "Most Recent Stay"}
   </span>
   ```

## Notes
- No new queries or state. The active/past distinction already exists in `getCurrentUserReservation`; this just surfaces it in the UI.
- The card only renders when `dailyBreakdown.length > 0`, so the label never appears in sample mode (no stays).
- The "Billing Locked" badge stays in its current position after the label.
- Works correctly under impersonation since `currentReservation` already reflects the viewed-as user.

## Verification
- View as a user mid-stay → label reads "— Current Stay".
- View as a user whose stay has ended → label reads "— Most Recent Stay".
- Confirm the Billing Locked badge still displays normally when applicable.
