# Daily & Final Input: Always show last stay

## Goal
The Daily and Final input page should always show the user's most recent past stay, no matter how long ago it ended. The generic "Sample Checkout Preview" should only appear when the user has **no stays at all** (new user / no reservations). The 7-day post-stay window is removed.

## Current behavior (confirmed in `src/pages/CheckoutFinal.tsx`, `getCurrentUserReservation`, lines 174–249)
1. If a reservation is active (today is between start and end), show it.
2. Otherwise pick the most recent past reservation — but **only if it ended ≤ 7 days ago**.
3. If the most recent past stay ended > 7 days ago (or there are no past stays), fall back to `undefined` → sample mode.

## Change
Edit `getCurrentUserReservation` in `src/pages/CheckoutFinal.tsx`:
- Keep step 1 (active reservation wins).
- Keep step 2 (most recent past reservation).
- **Remove the 7-day check** (lines 239–246). Return `mostRecentPast` whenever one exists, regardless of age.
- When `mostRecentPast` is absent (no past stays), return `undefined` → existing sample-mode logic kicks in unchanged.

No other files change. Sample-data generation, UI labels, and the active-stay rule are untouched.

## Edge cases / decisions
- User with only an upcoming (future) reservation and no past stays → shows Sample (per the request: "no stays yet"). Active-stay rule still shows an in-progress stay.
- Transferred-out and non-confirmed reservations remain excluded (existing filters unchanged).
- Impersonation / "View as user" mode is unaffected — it already routes through this same function with the impersonated user's reservations.

## Verification
- View as a user whose last stay ended > 7 days ago (e.g. Debbie's July 24–Aug 6 stay once it ages past 7 days): confirm the real stay shows, not the sample.
- View as a brand-new user with no reservations: confirm the Sample Checkout Preview still appears.
- View as a user mid-stay: confirm the active stay still shows.
