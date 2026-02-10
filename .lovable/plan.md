

## Bug Fix: Family Group Selector Not Visible for Paul (Org Admin)

### Root Cause

The family group selector on the calendar page uses this visibility check (line 264):

```
isCalendarKeeper || (organization?.admin_email === user?.email)
```

This only checks the `admin_email` field on the organization record. However, Paul is likely an admin through the `user_organizations` table (where `role = 'admin'`), not through the `admin_email` field. The `isAdmin` variable from `useUserRole()` already handles **both** admin paths, but it's not being used here.

### Fix

**File: `src/pages/CabinCalendar.tsx` (line 264)**

Change the `showFamilyGroupSelector` prop from:
```
showFamilyGroupSelector={isCalendarKeeper || (organization?.admin_email?.toLowerCase() === user?.email?.toLowerCase())}
```
to:
```
showFamilyGroupSelector={isCalendarKeeper || isAdmin}
```

`isAdmin` is already available -- it's destructured from `useUserRole()` on line 66. This is a one-line change with no risk, as it simply broadens the visibility check to include all recognized admin paths.

### No other changes needed
- No database or migration changes
- No new components or hooks
- The `isAdmin` variable already accounts for both `organization.admin_email` match and `user_organizations.role === 'admin'`

