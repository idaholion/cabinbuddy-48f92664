# Project conventions

- Reservation date expansions are validated by `reservation-edit-limits` in the shared update hook, using freshly read organization-scoped settings and stays; this covers both Edit Booking and Combine Into One Stay without double-counting the original stay.
- Reservation edit policy tests use Bun's test runner because the project has no existing test runner.
- New reservations use `reservation-create-limits` with exact target-year settings and explicit saved turns, re-read in the shared creation hook before saving; this prevents stale forms and used-pick counts from bypassing the Done handoff. Booking previews use a year-scoped snapshot rather than selection hooks with side effects.
- Historical stay settlement uses `stay-settlement` over each person's full chronological ledger, independent of year filters, without rewriting closing balances; later charges must not reopen debt already settled.