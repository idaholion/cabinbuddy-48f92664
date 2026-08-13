# Link the Departure Checklist to your most recent stay

## What's happening now

When you save the departure checklist, the page tries to find "your" reservation. It only accepts a reservation whose host name exactly matches your claimed profile name. Your claimed profile is **Richard Andrew**, but the host name stored on every Andrew Family reservation is just **Richard** — so no reservation matches, and the save falls through to the "Saved Locally Only / could not be linked to a reservation" path.

So this isn't about the stay being weeks old — the checklist would fail to link even while you were at the cabin.

There's a second issue behind it: even when a match is found, the code picks the reservation with the latest *start date*, which right now would be the upcoming Aug 14–21 stay rather than the stay you actually just finished.

## The fix

1. **Match hosts more forgivingly.** Compare host name to the claimed profile using a normalized comparison: case-insensitive, and treat a first-name-only host entry ("Richard") as a match for "Richard Andrew". Also accept a match on host email against the signed-in user's email, and keep the existing group-lead fallback.

2. **Pick the right stay.** Choose in this order:
   - a stay that includes today (in progress),
   - otherwise the most recently **ended** stay (latest end date that is on or before today),
   - otherwise the nearest upcoming stay.

3. **Show which stay is being filled out.** Display the linked reservation's date range near the top of the checklist ("Departure checklist for Jun 23 – Jul 3, 2026") so it is obvious which stay the entries attach to before you save.

4. **Better message when nothing links.** If there genuinely is no reservation, keep the local save but change the wording to explain that no reservation in your name was found, rather than implying the stay must be current.

## Technical notes

- All changes are in `src/pages/CheckoutList.tsx`, in `getCurrentUserReservation()` and the save handler's linked/unlinked branches.
- Name normalization uses the existing helpers in `src/lib/name-utils.ts` where possible; date comparison uses `parseDateOnly` from `src/lib/date-utils.ts`, already imported.
- Saving still upserts into `checkin_sessions` keyed by organization + `session_type='checkout'` + family group + the reservation date window, so re-saving days later updates the same row instead of creating duplicates.
- No database or schema changes.
