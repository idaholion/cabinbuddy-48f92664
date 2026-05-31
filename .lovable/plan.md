
# Build a sample preview page for the new Allocation Model chooser

## Goal

Let you see and click through the proposed new allocation-model UI **without touching the live Reservation Setup page**. You compare side-by-side, decide, then we either roll it in, tweak it, or scrap it.

## Approach

Add a single new route — **`/reservation-setup-preview`** — that renders the new chooser UI in isolation. Nothing it does writes to the database. The existing `/reservation-setup` page is untouched.

## What the preview page shows

A single full-width page with four stacked sections:

1. **Header banner** — "Preview: New Allocation Model Chooser. Nothing on this page saves to your organization." with a link back to the real Reservation Setup.
2. **"Help me choose" button** — opens the 3-question recommender dialog. End screen highlights one of the three tiles below.
3. **The three illustrated tiles** — Rotating Selection / Static Weeks / First Come, First Served. Each tile:
   - Friendly name + one-line "best for"
   - SVG mini-calendar illustration (color-coded family blocks)
   - 3 bullets: how picks happen, what changes year-to-year, who's in charge
   - "See an example" button → opens a drawer with a fully populated fake season (4 families, May–Sept)
   - Selecting a tile just highlights it in local state — no DB write
4. **"What would change if I switched?" panel** — when a tile other than the org's current model is selected, shows the inline consequences list (read-only, derived from real org state: rotation order length, static-week count, reservation count). Below it: a disabled-looking "Apply change" button with a note "Disabled in preview — visit Reservation Setup to actually apply."
5. **Inline FAQ strip** — collapsible "Common questions" block with 4–6 placeholder Q&As about allocation models.

## What it does NOT do

- No writes to `organizations`, `reservation_settings`, `allocation_model_audit`, or anything else.
- No changes to `/reservation-setup`, the existing radio-button card, or any allocation logic.
- No new database tables or migrations.
- No edge functions.
- Not linked from the main navigation by default — you reach it by typing the URL or via a small "Preview new UI" link I'll add at the top of the existing Reservation Setup card (you can ask me to remove that link if you'd rather keep it hidden).

## After you review

You tell me:
- **Ship it** → I replace the radio-button card in `ReservationSetup.tsx` with the new chooser and delete the preview route.
- **Change X, Y, Z** → I iterate on the preview page until it's right, then ship.
- **Scrap it** → I delete the preview route, nothing else changes.

## Technical notes

- New route `/reservation-setup-preview` in `src/App.tsx`, gated to authenticated org admins (same guard as `/reservation-setup`).
- New page `src/pages/ReservationSetupPreview.tsx` — thin shell that composes the new components.
- New components in `src/components/setup/`:
  - `AllocationModelChooser.tsx`
  - `AllocationModelTile.tsx`
  - `AllocationExampleDrawer.tsx`
  - `AllocationRecommenderDialog.tsx`
  - `AllocationSwitchConsequences.tsx`
- Consequences panel uses read-only queries via the `secureSelect` wrapper (rotation order length, static-week assignment count, reservation count for the active org) — read-only, no mutations.
- SVG mini-calendars are inline components themed with `index.css` tokens. No new asset files.
- Sample season fixtures live in `src/components/setup/allocation-samples.ts` — static data, no DB.
- FAQ strip uses hard-coded placeholder Q&As for the preview; we'll wire it to `useCBFaqItems` only when we ship for real.

Approve this and I'll build the preview page in build mode. Once you've seen it and given the green light (with or without tweaks), we'll do the real swap as a separate step.
