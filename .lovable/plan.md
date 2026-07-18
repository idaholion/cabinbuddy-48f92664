## What I found

Querying the database directly:

| Group | `alternate_lead_id` | Members present |
|---|---|---|
| Andrew Family | `""` (empty string, not NULL) | Richard Andrew, **Sam Andrew** |
| Woolf Family | `""` (empty string, not NULL) | Barb Woolf, Chanelle Knapp, Crystal Green |
| Cook Family | `"Whitney Blake"` ✅ | ... |
| Grandy Family | `"Chase Grandy"` ✅ | ... |
| Poznanovich Family | `"Peter Poznanovich"` ✅ | ... |
| newer groups (created after mid-June) | `NULL` | ... |

So Sam **was** the alternate lead for the Andrew group and someone/something is stored as `""` for Woolf. The values weren't deleted by hand — they were overwritten to an empty string during a save. Groups that were saved via the newer Setup flow correctly write `NULL`; groups touched by the older `FamilyGroupSetup` page write `""` when the dropdown state is empty.

**Root cause (unconfirmed but strongly supported by the code):** in `src/pages/FamilyGroupSetup.tsx` the save handler does:

```ts
alternate_lead_id: data.alternateLeadId === "none" ? undefined : data.alternateLeadId
```

The Zod schema is `z.string()`, so `""` is a valid value. If the form's `alternateLeadId` ever ends up as `""` — for example because autosave hydrated it as `""`, or because the stored name no longer matched any `<SelectItem>` after the recent firstName/lastName refactor and a subsequent save picked up an empty controlled value — the update writes `""` to the DB instead of leaving it alone. The check only guards against the sentinel `"none"`, not against empty/blank.

## Fix plan

1. **Restore the two lost values (data fix)**
   - `Andrew Family` → set `alternate_lead_id = 'Sam Andrew'`
   - `Woolf Family` → ask you which member should be alternate (Chanelle Knapp or Crystal Green?) before writing. I'll leave it as-is until you tell me.

2. **Harden the save path in `src/pages/FamilyGroupSetup.tsx`** (lines 452 and 470) so we never silently blank out an alternate:
   - Treat `"none"`, `""`, and whitespace-only as "no selection" and send `null` (explicit clear) only when the user actively chose "None selected".
   - If the dropdown value doesn't match any current member name (stale value from before a rename), skip writing the field instead of overwriting it — this prevents accidental clears when the member-name shape changes.

3. **Tighten the schema** in `src/lib/validations.ts`:
   - Change `alternateLeadId: z.string()` to default to `"none"` and reject empty strings, so form state can never silently become `""`.

4. **Normalize existing bad rows**: run a one-time update converting any `alternate_lead_id = ''` to `NULL` so the "no selection" state is unambiguous going forward.

5. **Verify**: reload both group pages and confirm the Alternate Group Lead dropdown shows the restored selection, then save each group and re-query to confirm the value survives.

## Question before I run the data fix

For **Woolf Family**, who should the alternate be — **Chanelle Knapp** or **Crystal Green**? (Andrew Family I'll restore to **Sam Andrew** since you confirmed that.)
