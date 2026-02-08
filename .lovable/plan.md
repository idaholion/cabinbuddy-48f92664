
# Simplify Calendar Filter Options

## Overview

This plan removes confusing filter options and replaces them with a single, intuitive toggle for viewing only your family's reservations.

## Changes Summary

| Current State | New State |
|---------------|-----------|
| "My bookings" checkbox | Removed |
| "Other bookings" checkbox | Removed |
| "Time periods" checkbox | Removed |
| (none) | New "Show only my family" toggle |

## User Experience

```text
Before:
┌─────────────────────────────┐
│ Show Bookings               │
│ ☑ My bookings               │
│ ☑ Other bookings            │
│ ☐ Time periods              │
│ ☑ Trade requests            │
│ ☑ Work weekends             │
└─────────────────────────────┘

After:
┌─────────────────────────────┐
│ View Options                │
│ ☐ Show only my family       │
│ ☑ Trade requests            │
│ ☑ Work weekends             │
└─────────────────────────────┘
```

- **Default (unchecked)**: Shows all reservations from all family groups
- **Checked**: Filters calendar to only show user's family group reservations

---

## Technical Details

### File: `src/components/PropertyCalendar.tsx`

**1. Update Filter State (lines 129-136)**

Replace three filter options with one:

```typescript
// Before
const [filterOptions, setFilterOptions] = useState({
  showMyBookings: true,
  showOtherBookings: true,
  showTimePeriods: false,
  showTradeRequests: true,
  showWorkWeekends: true,
  familyGroupFilter: 'all'
});

// After
const [filterOptions, setFilterOptions] = useState({
  showOnlyMyFamily: false,  // New consolidated option
  showTradeRequests: true,
  showWorkWeekends: true,
  familyGroupFilter: 'all'
});
```

**2. Update Main Calendar Filtering (lines 389-408)**

Simplify filtering logic:

```typescript
// Before
const isMyBooking = booking.family_group === userFamilyGroup;
if (isMyBooking && !filterOptions.showMyBookings) {
  return false;
}
if (!isMyBooking && !filterOptions.showOtherBookings) {
  return false;
}

// After
if (filterOptions.showOnlyMyFamily && booking.family_group !== userFamilyGroup) {
  return false;
}
```

**3. Update Mini Calendar Filtering (lines 1461-1468)**

Apply same simplified logic to mini calendar view.

**4. Remove Time Period Display Code**

- Remove time period border styling (line 1164)
- Remove time period header indicator (lines 1211-1213)
- Remove time period info display when no bookings (lines 1291-1299)

**5. Update Filter UI (lines 952-1001)**

Replace three checkboxes with single toggle:

```typescript
{/* Before: 3 separate checkboxes */}
{/* After: Single toggle */}
<div className="pt-3 border-t">
  <div className="text-sm font-medium mb-2">View Options</div>
  <div className="space-y-2">
    <label className="flex items-center space-x-2 text-sm">
      <input 
        type="checkbox" 
        checked={filterOptions.showOnlyMyFamily}
        onChange={(e) => setFilterOptions(prev => ({
          ...prev, 
          showOnlyMyFamily: e.target.checked
        }))}
        className="rounded border-border"
      />
      <span>Show only my family</span>
    </label>
    {/* Trade requests and Work weekends remain */}
  </div>
</div>
```

---

## Impact Summary

- Users see a cleaner, less confusing filter menu
- One toggle replaces three confusing options
- Theoretical "time period" windows no longer clutter the calendar
- Both main calendar and mini calendar views respect the filter
- The family group dropdown in the filter menu remains available for admins/calendar keepers who want to view a specific family's bookings
