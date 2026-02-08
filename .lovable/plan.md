# Family Group Lead/Member Merge Plan - COMPLETED ✅

## Overview
Merged the separate "Family Group Lead" section into the "Group Members" list, making Member 1 the designated Group Lead. This eliminates duplication and simplifies the data model.

## Changes Made

### FamilyGroupSetup.tsx
- ✅ Removed separate "Family Group Lead" section (lead name, email, phone fields)
- ✅ Added "GROUP LEAD" badge to Member 1 card
- ✅ Updated save logic to derive `lead_*` fields from `host_members[0]`
- ✅ Member 1 cannot be deleted (require at least 1 member)
- ✅ Removed auto-sync effect (no longer needed - single source of truth)
- ✅ Alternate Lead selector now excludes Member 1 by index

### GroupMemberCard.tsx
- ✅ Added `isGroupLead` prop to show GROUP LEAD badge
- ✅ Updated email/phone labels for Group Lead

### FamilyGroupHealthCheck.tsx
- ✅ Removed duplicate lead entries (now uses only host_members)
- ✅ First member marked as 'group_lead' type

### validations.ts
- ✅ Made `leadName`, `leadPhone`, `leadEmail` optional (backwards compatible)
- ✅ Added validation for Member 1 to require first/last name

## Data Model
- **On save**: `lead_*` fields derived from `host_members[0]`
- **Backwards compatible**: Legacy data with only lead_* fields still works
- **Single source of truth**: `host_members` array is the primary data source
