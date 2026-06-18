# Cabin Maintenance Page

A new page where family members log maintenance work, keep reference information (paint colors, model numbers), and track a shared to-do list. Styled like the Add Receipt page with the cabin background and "Cabin Maintenance" in the green script header.

## Page setup
- Route: `/cabin-maintenance`, protected, inside `MainLayout`, lazy-loaded in `App.tsx`
- Add a nav/menu link alongside the other cabin pages (Cabin Rules, Documents, Seasonal Checklists)
- `PageHeader` with `backgroundImage` styling and title "Cabin Maintenance" (matches the green script look used on the cabin pages)

## Three tabs

**1. Work Log** — dated maintenance actions
- New-entry button opens a dialog with: Title, Description, Date performed (defaults to today), Category, Performed by (defaults to current user, can override to any family member), Cost (optional), Photo attachments (multiple)
- List view: newest first, search box, category filter
- Each card shows title, date, who did it, category chip, cost (if set), thumbnail strip, expandable description

**2. Reference Info** — persistent facts (exterior stain color, well pump model, septic pumping interval, paint brands, etc.)
- Same dialog shape minus the "date performed" requirement (date becomes "last updated")
- Grouped by category, searchable
- Good for the "the stain used for the cabin exterior is XXXX" type of note

**3. To-Do** — open maintenance tasks
- Add task: Title, Description, Category, Priority (Low/Med/High), Optional target date, Optional assignee
- Checkbox to mark complete → moves into Work Log as a finished entry (prompts for any final notes/photos/cost)
- Filter by Open / Completed / All

## Categories (preset, with "Other")
Plumbing, Electrical, Exterior, Interior, Septic/Well, Appliances, HVAC, Grounds, Safety, Reference Info, Other

## Permissions
- Any family member can add entries to any tab
- Only the author or an admin/treasurer can edit or delete
- Tied to the current organization via the existing `createOrganizationContext` / secure query wrappers

## Helpful extras
- "Duplicate entry" action on Work Log items (e.g. annual Ridex treatment)
- Recent activity summary card at top: "5 entries this season, 2 open to-dos"
- Photo lightbox on click
- Empty-state illustrations with a "Add your first entry" CTA

## Technical details

**Database (Supabase migration, external project — user runs SQL manually per project memory):**
- `cabin_maintenance_entries` — organization_id, entry_type ('work_log' | 'reference' | 'todo'), title, description, category, date_performed, performed_by_member_id, performed_by_user_id, cost, priority, target_date, status ('open'|'completed'), completed_at, completed_from_todo_id, created_by, created_at, updated_at
- `cabin_maintenance_photos` — entry_id, storage_path, caption, uploaded_by, created_at
- Storage bucket: `cabin-maintenance-photos` (private, RLS-scoped to org members)
- RLS: read = org members; insert = org members; update/delete = author OR org admin/treasurer (via existing `has_role` helper)
- GRANTs to `authenticated` and `service_role` per project rules

**Frontend:**
- New page `src/pages/CabinMaintenance.tsx`
- Components under `src/components/cabin-maintenance/`: `MaintenanceTabs`, `WorkLogList`, `ReferenceInfoList`, `TodoList`, `MaintenanceEntryDialog`, `MaintenanceEntryCard`, `PhotoUploader`
- Hook `src/hooks/useCabinMaintenance.ts` using `secureSelect/Insert/Update/Delete` wrappers and `createOrganizationContext` (per project memory rule)
- React Query for caching, optimistic updates on todo toggle
- Zod schemas for the entry form

## Open questions before build
None blocking — will follow existing patterns (Documents/Shared Notes) for layout, photo handling, and permissions unless you want changes.
