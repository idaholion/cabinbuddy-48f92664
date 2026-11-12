# Separate-round completion: safe preview checks

Check the Lovable preview before publishing the calendar changes. Notification functions have already been deployed; the completed-family live test skipped without sending a message.

1. Open Calendar and choose 2027. Status must show free selection on hold, not Primary or a family taking a turn. Opening remains November 19, 2026 at 7 PM Mountain.
2. Switch to 2026 and back to 2027. The 2027 hold and opening must return, with no reversion to Primary after loading.
3. Use the existing read-only View As control for Tina, Dana, and Debbie. The same opening/hold should remain, and their existing stays should still be visible. Do not submit a booking as Admin: privileged users can override the hold by design.
4. Open Notification Management, Automated System. Completed selection turns must not appear as upcoming turn notices. Existing stay/work-weekend reminders may still appear. Delivery History should continue to open normally. Do not press Send during this check.
5. Open Reservation Setup without saving: active-season post-rotation settings remain a one-night minimum, unlimited total weeks, and the existing opening. Do not press Start Selection Season, reset anything, or save a new rotation.

Report which step differs from the expected result; wait to publish if any does.

These read-only checks do not verify a future live Done handoff. Test Round 1's two picks, Round 2's one pick, and explicit Done progression only in a separate test organization/season. Never reset the finished 2026 or 2027 production seasons for testing.

Agent validation: 90 policy tests and 11 notification tests passed; preview compilation passed. Both compatibility triggers are enabled in pg_catalog. All 178 reservation rows retained the identical fingerprint before/after the update. The automated browser reached login, so signed-in UI remains for Richard to check.