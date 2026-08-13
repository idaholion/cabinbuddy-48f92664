# Economic Survey data: why it's empty, and the fix

## Current state (verified)

- The `survey_responses` table has **0 rows** — no economic survey answers have ever reached the database.
- The survey save lives inside the same block as the checklist save in `src/pages/CheckoutList.tsx`: it only runs when a reservation was successfully linked. With the old rigid host-name matching, that branch never ran, so both the checklist and the survey fell through to local-only storage.
- Where the data is supposed to show up: **Documents page > Economic Impact Survey tab** (`/documents?tab=economic-survey`, rendered by `EconomicSurveyTab.tsx`). The old `/survey-responses` route now redirects there.

So it's the same root cause as the departure checklist, and the fuzzy-matching fix already applied will make future submissions save. But there are three remaining problems worth fixing while we're here.

## Problems to fix

1. **Survey is coupled to reservation linking.** The economic survey is org-level data (spending near the cabin); it does not need a reservation. If a reservation can't be found, the survey should still save with the user's family group and today's date, instead of being lost.

2. **Every save creates a new row.** `createResponse()` always inserts. Re-saving the checklist would create duplicate survey rows for the same stay, inflating the totals on the Documents tab. Saving should update the existing response for that family group and stay window instead.

3. **The Documents tab displays counts as dollars.** The eight items at the top of the survey ask "how many times did you do the following", but `EconomicSurveyTab` formats every value as currency and titles the total "Total Economic Impact / Combined spending in area". It also labels only the eight default item ids — any custom survey item an admin adds shows its raw id.

4. **The "Approximate $ spent in area" field is not wired up at all.** That 9th field at the bottom of the survey is an uncontrolled input with no state and no save — whatever is typed is discarded on every save. It is the one genuinely dollar-valued answer.

## The fix

1. In `src/pages/CheckoutList.tsx`, move the survey save out of the reservation-linked branch so it always runs when there is an organization and any survey answers exist. Use the linked reservation's family group and end date when available, otherwise the user's own family group and today's date.

2. Change the survey save to look for an existing `survey_responses` row for the same organization + family group + stay window and update it, creating one only when none exists. Report survey save success/failure separately from the checklist so a partial failure is visible.

3. Wire up the "Approximate $ spent in area" input: bind it to state, save it alongside the other answers under a dedicated `amountSpent` key, and reload it with the rest of the saved survey data.

4. In `src/components/EconomicSurveyTab.tsx`, split the presentation by value type:
   - The eight activity items display as **counts** (plain numbers), with a "Total Activities Reported" summary instead of "Total Economic Impact".
   - `amountSpent` displays as **currency**, and is what drives a separate "Total $ Spent in Area" summary card and its own column in the responses table.
   - Custom survey items fall back to their own label (or a prettified id) rather than showing a raw key, and are treated as counts.

5. Leave the past, lost submissions alone — they only ever existed in each person's browser localStorage and cannot be recovered server-side. If someone re-opens the departure checklist in the same browser, their answers reload and a re-save will now persist.


## Technical notes

- Files touched: `src/pages/CheckoutList.tsx` (save handler), `src/hooks/useChecklistData.ts` (add an upsert-style `saveResponse` alongside `createResponse`), `src/components/EconomicSurveyTab.tsx` (display).
- All reads/writes keep using the existing `secureSelect`/`secureInsert`/`secureUpdate` wrappers with `createOrganizationContext()`.
- No database or schema changes.
