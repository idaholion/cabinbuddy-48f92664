# Date Handling Guide

## Critical Rule: Never Use `new Date()` on Database Date Strings

### The Problem

Database date fields (like `start_date`, `end_date`, `check_date`) are stored as **date-only strings in YYYY-MM-DD format**.

When you use `new Date("2025-10-06")`, JavaScript interprets this as **UTC midnight**, which causes timezone shifts:
- **Your timezone**: America/New_York (UTC-4 or UTC-5)
- **What happens**: `new Date("2025-10-06")` → Oct 5 at 8:00 PM (previous day!)
- **Result**: Calendar shows Oct 5 when database says Oct 6

### The Solution: Always Use `parseDateOnly()`

```typescript
import { parseDateOnly } from '@/lib/date-utils';

// ❌ WRONG - Will shift dates in most timezones
const checkIn = new Date(reservation.start_date);
const checkOut = new Date(reservation.end_date);

// ✅ CORRECT - Interprets as local midnight
const checkIn = parseDateOnly(reservation.start_date);
const checkOut = parseDateOnly(reservation.end_date);
```

## Common Patterns

### 1. Displaying Dates

```typescript
// ❌ WRONG
{new Date(reservation.start_date).toLocaleDateString()}

// ✅ CORRECT
{parseDateOnly(reservation.start_date).toLocaleDateString()}
```

### 2. Comparing Dates

```typescript
// ❌ WRONG
const isAfter = new Date(endDate) > new Date(startDate);

// ✅ CORRECT
const isAfter = parseDateOnly(endDate) > parseDateOnly(startDate);
```

### 3. Filtering by Date Range

```typescript
// ❌ WRONG
const filtered = items.filter(item => {
  const itemDate = new Date(item.date);
  return itemDate >= startDate && itemDate <= endDate;
});

// ✅ CORRECT
const filtered = items.filter(item => {
  const itemDate = parseDateOnly(item.date);
  return itemDate >= startDate && itemDate <= endDate;
});
```

### 4. Calculating Date Differences

```typescript
// ❌ WRONG
const nights = Math.floor(
  (new Date(endDate).getTime() - new Date(startDate).getTime()) 
  / (1000 * 60 * 60 * 24)
);

// ✅ CORRECT
import { calculateNights } from '@/lib/date-utils';
const nights = calculateNights(startDate, endDate);
```

## Database Fields That Need `parseDateOnly()`

Always use `parseDateOnly()` for these fields:

### Reservations
- `start_date`
- `end_date`
- `allocated_start_date`
- `allocated_end_date`

### Payments
- `due_date`
- `paid_date`

### Receipts
- `date`

### Check-in Sessions
- `check_date`

### Trade Requests
- `requested_start_date`
- `requested_end_date`

### Invoices
- `issue_date`
- `due_date`

### Billing Cycles
- `start_date`
- `end_date`

### Daily Breakdown
- `date` (in daily occupancy arrays)

## How to Search for Violations

Use these searches to find potential issues:

```bash
# Find potential violations
grep -r "new Date(.*\..*date" src/

# Look for these patterns specifically:
- new Date(reservation.start_date)
- new Date(reservation.end_date)
- new Date(payment.due_date)
- new Date(receipt.date)
- new Date(session.check_date)
```

## Testing Dates

When testing, remember:
- Database stores: `"2025-10-06"`
- With `parseDateOnly()`: Oct 6 in all timezones ✅
- With `new Date()`: Oct 5 in America/New_York ❌

## Exception: Current Date/Time

The only time you should use `new Date()` without arguments is for the current date/time:

```typescript
// ✅ CORRECT - Getting current date/time
const now = new Date();
const today = new Date();
today.setHours(0, 0, 0, 0);
```

## Converting Back to Database Format

When saving dates back to the database:

```typescript
import { toDateOnlyString } from '@/lib/date-utils';

// Convert Date object to YYYY-MM-DD string
const dateString = toDateOnlyString(new Date());
// Result: "2025-10-06"
```

## Code Review Checklist

Before committing code, check:
- [ ] No `new Date(variable.something_date)` patterns
- [ ] All database date fields use `parseDateOnly()`
- [ ] Date calculations use utility functions
- [ ] Display code uses the parsed dates, not raw strings

## Quick Reference

```typescript
import { parseDateOnly, toDateOnlyString, calculateNights } from '@/lib/date-utils';

// Parse from database
const date = parseDateOnly(dbDateString);

// Display
date.toLocaleDateString();

// Convert to database format
const dbString = toDateOnlyString(date);

// Calculate nights between dates
const nights = calculateNights(startDate, endDate);
```
