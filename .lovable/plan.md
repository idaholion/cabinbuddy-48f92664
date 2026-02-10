

## Shrink "Secondary Selection Complete" Status Box

### What Changes
The large "Secondary Selection Complete" card that currently takes up significant space on the calendar page will be condensed into a small inline indicator placed next to the "Booking" button in the toolbar.

### Visual Result
Instead of a full card with title and alert box, you'll see a compact green status badge reading:
**"All groups completed 2026 secondary selections"** -- right next to the Booking dropdown button in the toolbar row.

### Technical Details

**File: `src/components/SecondarySelectionManager.tsx`**
- Change the `allSecondaryComplete` return block (lines 188-206) from a full `Card` with `CardHeader`, `CardTitle`, `CardContent`, and `Alert` to a simple inline `div` with smaller text and a compact green checkmark icon
- Use `text-sm` sizing and `flex items-center gap-2` layout so it fits inline
- Abbreviated text: "All groups completed {rotationYear} secondary selections"

**File: `src/pages/CabinCalendar.tsx`**
- Move the `SecondarySelectionManager` rendering (lines 392-400) from its current position (a standalone block above the toolbar) into the toolbar row, placing it next to the "Booking" button around line 643
- Remove the `mb-4` wrapper div and instead render it inline within the toolbar's flex layout
- This ensures the compact status text sits alongside the Booking controls rather than taking a full row

