

## Bulk Import with Smart Bill Matching

### The Problem
Excel bill names won't always match existing recurring bill names exactly (e.g., "Lease" vs "Forest Service Lease", or "Personal Property Tax" which may not exist yet).

### Solution: Mapping UI in the Bulk Import Dialog

The bulk import component will include a **column mapping step** with three scenarios for each Excel bill name:

1. **Exact match** — auto-linked (green checkmark). E.g., "Insurance" → "Insurance"
2. **Fuzzy match suggestion** — system suggests a match using normalized string comparison, user confirms or overrides. E.g., "Lease" → suggests "Forest Service Lease" (contains "Lease")
3. **No match** — user chooses to either:
   - Map to an existing bill via dropdown
   - Create a new recurring bill automatically

### Technical Approach

**New file: `src/components/BulkHistoricalImport.tsx`**

Key sections:
- **File upload / paste area** — accepts `.xlsx` upload (parsed with a lightweight xlsx reader using the already-installed `jszip`) or pasted TSV
- **Parser** — detects the layout from your Excel format: bill names in column A, dates across the top row, amounts in the grid
- **Matching engine** — for each bill name from Excel:
  - Exact match (case-insensitive, trimmed)
  - Containment match ("Lease" is contained in "Forest Service Lease")
  - Scored fuzzy match using existing `normalizeName` pattern from `name-utils.ts`
- **Mapping UI** — a table showing each Excel bill name with:
  - Match status indicator (green/yellow/red)
  - Dropdown to select from existing bills or "Create New"
  - Preview of how many entries will be imported
- **Import execution** — merges entries into `historical_values` JSON on matched bills, or creates new `recurring_bills` rows for "Create New" selections

**Modified: `src/components/RecurringBills.tsx`**
- Add "Bulk Import" button (with Upload icon) in the header area
- Pass existing bills list and a refresh callback to the import dialog

**No database changes needed** — uses existing `recurring_bills` table with its `historical_values` JSON column. New bills are inserted via standard Supabase insert.

### Matching Logic Detail

```text
Excel Name          Existing Bills              Result
─────────────────   ─────────────────────────   ──────────────────────
"Insurance"         "Insurance"                 ✅ Exact match
"Lease"             "Forest Service Lease"      🟡 Suggested (contains)
"Fall River Rural"  "Fall River Rural"          ✅ Exact match
"Personal Prop Tax" (none)                      🔴 Create new / manual map
"Bank Charges"      "Bank Charges/ Office"      🟡 Suggested (partial)
```

### User Flow

1. Click "Bulk Import" on Recurring Bills tab
2. Upload Excel file or paste data
3. System parses and shows mapping table
4. Review auto-matches, fix yellow/red items via dropdowns
5. For unmatched items, pick "Create New Bill" (pre-fills name, category defaults to "Other")
6. Click "Import" — data merges into existing bills, new bills created as needed
7. Success toast with summary (e.g., "Imported 60 entries across 6 bills, created 2 new bills")

