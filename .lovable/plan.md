# Family Group Lead/Member Merge Plan

## Overview
Merge the separate "Family Group Lead" section into the "Group Members" list, making Member 1 the designated Group Lead. This eliminates duplication and simplifies the data model.

## Current State
- **Separate sections**: Lead info stored in `lead_name`, `lead_email`, `lead_phone` fields
- **Duplication**: Lead info synced to `host_members[0]`, causing the same person to appear twice
- **Confusion**: Users see the lead listed separately AND as a member

## Proposed State
- **Single list**: All members in `host_members[]` array
- **Member 1 = Lead**: First member is automatically the Group Lead
- **Visual badge**: Member 1 shows "GROUP LEAD" badge
- **Derived fields**: `lead_name`, `lead_email`, `lead_phone` derived from `host_members[0]` on save

## Database Impact
- **No schema changes needed**: Keep existing `lead_*` fields for backwards compatibility
- **On save**: Auto-populate `lead_*` fields from `host_members[0]`
- **Read behavior**: UI reads from `host_members[]` as primary source

## UI Changes

### FamilyGroupSetup.tsx
1. Remove separate "Family Group Lead" section
2. Rename section to "Family Group Members"
3. Member 1 card:
   - Add "GROUP LEAD" badge (green, prominent)
   - Include "Alternate Lead" dropdown within this card or as separate field
   - Cannot be deleted (must have at least one member)
4. Members 2+:
   - Show as regular members
   - Deletable
   - Could be promoted to lead in future enhancement

### FamilyGroupHealthCheck.tsx
1. Remove duplicate lead entry in member lists
2. Show single unified list per family group
3. Add "Lead" indicator next to Member 1's name

## Implementation Steps

### Phase 1: FamilyGroupSetup UI Refactor
- [ ] Remove separate lead section (lead name, email, phone fields)
- [ ] Add GROUP LEAD badge to Member 1 card
- [ ] Move Alternate Lead selector (keep it visible, perhaps below group name or in Member 1 card)
- [ ] Update save logic to populate `lead_*` fields from `host_members[0]`
- [ ] Ensure Member 1 cannot be deleted (require at least 1 member)

### Phase 2: FamilyGroupHealthCheck Update
- [ ] Remove duplicate lead entries from display
- [ ] Add "Lead" badge/indicator to first member
- [ ] Verify health check logic works with unified model

### Phase 3: Other Pages Audit
- [ ] SupervisorFamilyGroupsTab.tsx - verify no duplication
- [ ] AdminShareOverview.tsx - check member displays
- [ ] Any other pages showing family group members

## Risks & Mitigations
- **Data consistency**: On save, always sync `host_members[0]` → `lead_*` fields
- **Empty groups**: Require at least one member (the lead)
- **Existing data**: Works with current data, just changes display

## Acceptance Criteria
1. Lead appears only once per family group in UI
2. Member 1 clearly marked as "GROUP LEAD"
3. Alternate Lead selection still functional
4. Health Check shows each person exactly once
5. No data loss during transition
