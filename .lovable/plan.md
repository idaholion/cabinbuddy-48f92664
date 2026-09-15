# Fix: Holly gets bounced from Family Group Setup back to her profile page

## What's actually happening

Holly signs in as **hcook@kw.com**. The Cook Family group records its lead's email as
**lavenderlily33@gmail.com** (lead name: Holly Cook). Two things follow from that:

- The app decides "are you the group lead?" by comparing the login email to the group's lead
  email only. Holly's two addresses don't match, so she is treated as an ordinary member.
- Family Group Setup sends ordinary members to the Group Member Profile page, so she is bounced
  back every time.

There is also a duplicate entry in the Cook Family member list: "Holly Cook" appears twice — once
with lavenderlily33@gmail.com and once with hcook@kw.com.

## The fix

**1. Recognize the lead by name as well as email**

If the signed-in person's name matches the group's lead name, treat them as the group lead — the
app already computes this name match but currently ignores it when deciding the role. This also
helps any other lead who signs in with a different address than the one on file.

**2. Stop the bounce for members who are allowed to manage the group**

Family Group Setup will only redirect someone away if they are neither the lead, nor an admin, nor
a member whose "manage the whole family group" checkboxes are ticked. A member with those
permissions can open the page and edit their group.

**3. Clean up Holly's duplicate entry (data, done separately)**

The Cook Family member list has Holly twice. Recommended: keep one Holly Cook entry carrying both
addresses — login email hcook@kw.com — and remove the stale duplicate. I'll prepare the SQL for
you to run, and I'll show you the before/after values before anything is changed.

## Technical notes

- `src/hooks/useUserRole.ts`: `setIsGroupLead(!!leadGroup)` becomes
  `!!leadGroup || !!nameMatchedLeadGroup`, and `userFamilyGroup` falls back to the name-matched
  lead group. `isGroupMember` stays `!isGroupLead && !!userHostInfo`.
- `src/hooks/useEffectiveRole.ts`: confirm its lead resolution follows the same rule so Stay
  History / Daily & Final behave consistently.
- `src/pages/FamilyGroupSetup.tsx` (redirect effect, ~line 250): condition becomes
  `isGroupMember && !isGroupLead && !isAdmin && !isSupervisor && !canEditReservations &&
  !canEditDailyFinal && !canEditStayHistory`, using the permission flags already exposed by
  `useEffectiveRole`.
- No schema change. The duplicate-member cleanup is a one-off update to
  `family_groups.host_members` for the Cook Family row, run by you in the SQL editor.
