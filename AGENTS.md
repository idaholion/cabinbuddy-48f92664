# Project conventions

- Reservation date expansions are validated by `reservation-edit-limits` in the shared update hook, using freshly read organization-scoped settings and stays; this covers both Edit Booking and Combine Into One Stay without double-counting the original stay.
- Reservation edit policy tests use Bun's test runner because the project has no existing test runner.
- Historical stay settlement uses `stay-settlement` over each person's full chronological ledger, independent of year filters, without rewriting closing balances; later charges must not reopen debt already settled.