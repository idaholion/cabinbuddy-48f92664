## Problem

In `src/components/SeasonalChecklistViewer.tsx`, each checklist row has two competing click handlers:

- The wrapper `<div>` calls `toggleItem(item.id)` on click.
- The `<Checkbox>` inside it also calls `toggleItem(item.id)` via `onCheckedChange`.

When the user clicks the checkbox directly, both handlers fire (the checkbox change + the parent div click bubbling up), toggling the state twice and leaving it unchanged. Clicking the row text only fires once, which is why Dana could check an item (by clicking text/row) but couldn't uncheck it (when clicking the checkbox itself).

## Fix

Make the row click the single source of truth, and let the checkbox be a visual reflection only:

- Keep `onClick={() => toggleItem(item.id)}` on the row wrapper.
- Change the `<Checkbox>` to not have its own handler — render it as a controlled visual (`checked={...}`) and remove `onCheckedChange`, OR stop click propagation on the checkbox and only let `onCheckedChange` fire.

Preferred: remove `onCheckedChange` from the Checkbox and add `onClick={(e) => e.stopPropagation()}` is not needed if there's no handler — the bubbled div click will still toggle it. Simplest change: delete the `onCheckedChange` line.

## Files

- `src/components/SeasonalChecklistViewer.tsx` (around line 184–188)

## Verification

- Check an item → state becomes checked.
- Click the same checkbox again → state becomes unchecked.
- Click the row text → toggles as before.
