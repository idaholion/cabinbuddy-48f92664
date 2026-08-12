# Plan: Clarify "pending" status labels on Stay History page

## Problem
On the Stay History page (`src/pages/StayHistory.tsx`), two different stay states both display the identical word "pending" but mean different things:

- **Grey "pending"** (`secondary` badge): `billingAmount === 0 && !hasOccupancyData` — the stay was never run through the Daily & Final checkout process (no billing amount recorded, no occupancy data). This is "not checked out," not "pending payment."
- **Red "pending"** (`destructive` badge, the fallback): billing exists, `amountDue > 0`, `amountPaid === 0` — the stay was billed but nothing has been paid. This is genuinely "pending payment."

Using the same word for both is the source of the confusion.

## Change
Relabel the status badge text in `src/pages/StayHistory.tsx` (around lines 1057–1066) so the two states are distinguishable:

- Grey badge: `pending` → `Not checked out`
- Red fallback badge: `pending` → `Pending payment`

Keep the existing badge variants (grey `secondary` for not-checked-out, red `destructive` for unpaid). No database, logic, or status-value changes — display text only.

### Code change (current → new)

```ts
// Current
const isPending = stayData.billingAmount === 0 && !stayData.hasOccupancyData;
const isPaid = stayData.amountDue <= 0;
const isPartial = !isPaid && stayData.amountPaid > 0;
return (
  <Badge variant={isPending ? 'secondary' : isPaid ? 'default' : isPartial ? 'secondary' : 'destructive'}>
    {isPending ? 'pending' : isPaid ? 'paid' : isPartial ? 'partial' : 'pending'}
  </Badge>
);

// New
const isPending = stayData.billingAmount === 0 && !stayData.hasOccupancyData;
const isPaid = stayData.amountDue <= 0;
const isPartial = !isPaid && stayData.amountPaid > 0;
return (
  <Badge variant={isPending ? 'secondary' : isPaid ? 'default' : isPartial ? 'secondary' : 'destructive'}>
    {isPending ? 'Not checked out' : isPaid ? 'paid' : isPartial ? 'partial' : 'Pending payment'}
  </Badge>
);
```

## Scope
- Single file: `src/pages/StayHistory.tsx`
- Display-only; no schema, query, or status-enum changes
- No other pages affected (CheckoutFinal uses its own labels and is not part of this change)
