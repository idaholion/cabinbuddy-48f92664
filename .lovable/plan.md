
# Plan: Add "Send Invite to All" Feature

## Overview
Add a "Send Invite to All" button next to the existing "Copy Invite Link" button on both the **Family Organization Setup** and **Family Group Setup** pages. This will allow admins and group leads to send invitation emails to all members who have email addresses configured.

## Current State
- **Family Setup** (`src/pages/FamilySetup.tsx`): Has "Copy Invite Link" button at line 817-825 for admins
- **Family Group Setup** (`src/pages/FamilyGroupSetup.tsx`): Has "Copy Invite Link" button at lines 923-942 for group leads/admins
- **Messaging Infrastructure**: The `send-message` edge function already supports email sending via Resend
- **Member Data**: Available through `useFamilyGroups` hook which provides `host_members` array with email addresses

## Implementation Approach

### 1. Create Reusable Send Invite Dialog Component
**New File:** `src/components/SendInviteDialog.tsx`

A confirmation dialog that:
- Shows a preview of how many members will receive the invite
- Lists members who have emails vs. those who don't (won't receive invite)
- Includes the organization name and invite link in the message
- Has "Send Invites" and "Cancel" buttons
- Shows a loading state while sending

### 2. Update Family Organization Setup Page
**File:** `src/pages/FamilySetup.tsx`

Changes:
- Import the new `SendInviteDialog` component
- Add a "Send Invite to All" button next to "Copy Invite Link"
- Collect all members with emails from all family groups
- Pass data to the dialog component

### 3. Update Family Group Setup Page
**File:** `src/pages/FamilyGroupSetup.tsx`

Changes:
- Import the new `SendInviteDialog` component
- Add a "Send Invite to All" button next to the existing "Copy Invite Link"
- Scope to only members within the selected family group
- Pass data to the dialog component

### 4. Leverage Existing Edge Function
The `send-message` edge function will be used with a new message template for invitations. No changes needed to the edge function itself - we'll compose the invite email on the frontend and send individual emails to each member with an email address.

## Technical Details

### SendInviteDialog Component Structure
```text
┌─────────────────────────────────────────────────┐
│  Send Invitation Emails                         │
├─────────────────────────────────────────────────┤
│                                                 │
│  You're about to send invitation emails to      │
│  join [Organization Name].                      │
│                                                 │
│  ✅ Will receive invite (3 members):            │
│     • John Smith (john@email.com)               │
│     • Jane Doe (jane@email.com)                 │
│     • Bob Wilson (bob@email.com)                │
│                                                 │
│  ⚠️ No email on file (2 members):              │
│     • Tom Jones                                 │
│     • Mary White                                │
│                                                 │
├─────────────────────────────────────────────────┤
│                    [Cancel]  [Send Invites]     │
└─────────────────────────────────────────────────┘
```

### Email Content
The invitation email will include:
- Organization name
- A personalized greeting using the member's name
- A direct join link with the organization code pre-filled
- Brief instructions on how to sign up/log in

### Button Placement
**Family Setup Page:**
```text
[Organization Code: CABIN123]
[Copy Code] [Copy Invite Link] [Send Invite to All] [Change Code]
```

**Family Group Setup Page:**
```text
[Copy Invite Link] [Send Invite to All]
```

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/components/SendInviteDialog.tsx` | Create | New reusable dialog component |
| `src/pages/FamilySetup.tsx` | Modify | Add button and dialog integration |
| `src/pages/FamilyGroupSetup.tsx` | Modify | Add button and dialog integration |

## Edge Cases Handled
- **No members with emails**: Show a message that no invites can be sent
- **Some members without emails**: Show which members won't receive invites
- **Already sent invites**: Users can send invites multiple times (invites are idempotent)
- **Send failure**: Show error toast if email sending fails

## User Flow
1. Admin/Group Lead clicks "Send Invite to All"
2. Dialog opens showing member breakdown (who will/won't receive emails)
3. User reviews and clicks "Send Invites"
4. Loading state shows while emails are being sent
5. Success toast confirms emails sent
6. Dialog closes

## Permissions
- **Family Setup Page**: Only visible to admins (same as existing "Copy Invite Link")
- **Family Group Setup Page**: Visible to group leads, admins, and supervisors (same as existing button)
