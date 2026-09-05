# Plan: Camera page links from Arrival and Departure checklists

## Goal
When a checklist item starts with "Open the Arlo App", show a small link/button that takes the person to the Cabin Security Cameras page — and the camera page shows a "Return to checklist" button that sends them back to the exact checklist they came from.

## Behavior
- **Arrival Checklist** (`/checkin`): the last item ("Open the Arlo App…") gets a "View camera instructions" link.
- **Departure Checklist** (`/checkout-list`): the first item in the "Lower Level Inside" section gets the same link.
- **Camera page** (`/cabin-security-cameras`): when opened from a checklist link, a small banner at the top reads e.g. "Viewing from the Departure Checklist — Return to checklist". Clicking it goes back to the correct checklist page. Opening the camera page directly from the sidebar shows no banner.

## Approach: URL query parameter (recommended)
The link will be: `/cabin-security-cameras?from=checkin` or `?from=checkout-list`. The camera page reads the parameter and knows which checklist to return to. This survives page refresh and works even if the person bookmarks or re-opens the link — the router-state approach does not. This is the simple, reliable choice and needs no decision from you.

## Technical details
1. **Camera page** — `src/pages/CabinSecurityCameras.tsx`: read the `from` query param via `useSearchParams`; if present and recognized, render a "Return to Arrival Checklist" / "Return to Departure Checklist" button near the top that navigates to `/checkin` or `/checkout-list`.
2. **Arrival Checklist** — `src/pages/CheckIn.tsx` (item render around line 447): when `item.label` starts with "Open the Arlo App" (case-insensitive), render a camera-instructions link under the item pointing to `/cabin-security-cameras?from=checkin`.
3. **Departure Checklist** — `src/pages/CheckoutList.tsx` (item render around line 1127): same detection on `item.label`, linking to `/cabin-security-cameras?from=checkout-list`.
4. Matching is text-based ("Open the Arlo App"), so no checklist data changes are needed; if the item wording is edited later to remove that phrase, the link simply stops appearing.
5. Checklist progress/state is untouched — navigating away and back reloads the checklist from the database, so nothing is lost.

## Verify
- Build passes; manually confirm the link appears on both checklists and the return button on the camera page goes back to the right checklist.
