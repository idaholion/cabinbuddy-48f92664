

# Remove Trade Requests and Work Weekends Filter Options

## Overview

This plan removes the last two unnecessary filter checkboxes from the calendar, leaving only the useful "Show only my family" toggle and the family group dropdown. Trade requests and work weekends will always be visible when they exist.

## Changes Summary

| Current State | New State |
|---------------|-----------|
| "Trade requests" checkbox (default: checked) | Removed - always shown |
| "Work weekends" checkbox (default: checked) | Removed - always shown |

## User Experience

```text
Before:
┌─────────────────────────────┐
│ View Options                │
│ ☐ Show only my family       │
│ ☑ Trade requests            │
│ ☑ Work weekends             │
├─────────────────────────────┤
│ Family Group                │
│ [All Groups          ▼]     │
└─────────────────────────────┘

After:
┌─────────────────────────────┐
│ View Options                │
│ ☐ Show only my family       │
├─────────────────────────────┤
│ Family Group                │
│ [All Groups          ▼]     │
└─────────────────────────────┘
```

---

## Technical Details

### File: `src/components/PropertyCalendar.tsx`

**1. Simplify Filter State (lines 129-134)**

Remove the two filter options from state:

```typescript
// Before
const [filterOptions, setFilterOptions] = useState({
  showOnlyMyFamily: false,
  showTradeRequests: true,
  showWorkWeekends: true,
  familyGroupFilter: 'all'
});

// After
const [filterOptions, setFilterOptions] = useState({
  showOnlyMyFamily: false,
  familyGroupFilter: 'all'
});
```

**2. Update getWorkWeekendsForDate Function (lines 186-188)**

Remove the filter check - always return work weekends:

```typescript
// Before
const getWorkWeekendsForDate = (date: Date) => {
  if (!filterOptions.showWorkWeekends) return [];
  // ...rest of logic
};

// After
const getWorkWeekendsForDate = (date: Date) => {
  // Remove the filter check, always show work weekends
  return workWeekends.filter(ww => {
    // ...rest of logic unchanged
  });
};
```

**3. Update Trade Request Display Logic (line 1129)**

Remove the filter check from the pending trade indicator:

```typescript
// Before
const hasPendingTrade = tradeRequests.length > 0 && filterOptions.showTradeRequests;

// After
const hasPendingTrade = tradeRequests.length > 0;
```

**4. Remove Filter UI Checkboxes (lines 960-977)**

Delete the two checkbox labels for Trade requests and Work weekends, keeping only the "Show only my family" toggle.

---

## Impact Summary

- Cleaner filter menu with only two options (toggle + dropdown)
- Trade request indicators (red pulsing dots) always visible when pending trades exist
- Work weekend indicators (green background) always visible for approved work weekends
- No loss of functionality - these were always checked by default anyway
- Simpler state management with fewer filter options to track

