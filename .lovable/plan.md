# Changing a member's email: a complete, one-step process (Holly Cook)

## What actually happened

Holly's sign-in account is still **hcook@kw.com** — that never changed. What she changed was the
*contact* email in her family group, which is now **lavenderlily33@gmail.com**. The app decides
"are you the group lead?" by comparing the **sign-in** email to the family group's lead email, so
after her change the two no longer match: she became an ordinary member, and Family Group Setup
bounced her back to the profile page.

There is also a leftover duplicate: the Cook Family member list has "Holly Cook" twice — once with
lavenderlily33@gmail.com and once with hcook@kw.com.

## The fix, in two parts

### 1. One button that changes an email everywhere

Today the supervisor tool changes only the login credential, and warns you to update contact emails
by hand. Instead, a single **Change a Person's Email** tool that:

- Shows a preview first: every place the old address appears (sign-in account, family group lead,
  member list entries, share allocations, work weekend and trade records, votes, organization
  roles such as admin / treasurer / calendar keeper), with counts.
- On confirm, updates all of them to the new address in one transaction, and removes any duplicate
  member entry left behind for the same person.
- Writes an audit entry recording old address, new address, and what was touched.
- Tells the person in plain words what happens next: the old address stops working immediately,
  and they must sign in with the new one — signing out and back in is required.

### 2. Move Holly to lavenderlily33@gmail.com and clean up

Run the new tool for hcook@kw.com → lavenderlily33@gmail.com. That makes her sign-in match the
Cook Family lead email again, so Family Group Setup opens normally, and it removes the stale
hcook member entry.

### Safety net (small, worth doing)

Even after this, an email mismatch shouldn't lock a lead out. Lead detection will also accept a
name match against the group's lead name, and Family Group Setup will stop redirecting anyone who
is a lead by name or who has the "manage the whole family group" checkboxes ticked.

## Technical notes

- New migration: `supervisor_change_member_email(p_old_email, p_new_email, p_confirmation_code)` —
  SECURITY DEFINER, supervisor-only, replaces the narrow `supervisor_fix_user_email`. Updates
  `auth.users.email` (and `email_confirmed_at`/identities as needed), `family_groups.lead_email`,
  email entries inside `family_groups.host_members` jsonb, `organizations.admin_email` /
  `treasurer_email` / `calendar_keeper_email` / `alternate_supervisor_email`,
  `member_share_allocations.member_email`, `trade_requests.requester_email` /
  `target_host_email`, `work_weekends.proposer_email`, `work_weekend_approvals.approved_by_email`,
  `work_weekend_comments.commenter_email`, `votes.voter_email`, `feedback.email`. De-duplicates
  `host_members` entries that resolve to the same person. Logs to `bulk_operation_audit`.
- Companion read-only function `supervisor_preview_email_change(p_email)` returning per-table
  counts, used to render the preview.
- `src/components/SupervisorUserTools.tsx`: replace the current form with preview → confirm flow;
  drop the "contact emails must be updated manually" warning.
- `src/hooks/useUserRole.ts`: `setIsGroupLead(!!leadGroup || !!nameMatchedLeadGroup)` and fall back
  to the name-matched group for `userFamilyGroup`.
- `src/pages/FamilyGroupSetup.tsx` redirect effect (~line 250): also skip the redirect when the
  member has `canEditReservations` / `canEditDailyFinal` / `canEditStayHistory`.
- Note: Holly's browser "remembering" the old address is only autofill — no code change can alter
  that; the tool's next-steps message covers it.
