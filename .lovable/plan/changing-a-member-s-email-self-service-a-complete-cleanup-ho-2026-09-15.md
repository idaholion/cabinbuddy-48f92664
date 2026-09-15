# Changing a member's email: self-service + a complete cleanup (Holly Cook)

## What actually happened

Holly's sign-in account is still **hcook@kw.com** — that never changed. What she changed was the
*contact* email in her family group, which is now **lavenderlily33@gmail.com**. The app decides
"are you the group lead?" by comparing the **sign-in** email to the family group's lead email, so
after her change the two no longer match: she became an ordinary member, and Family Group Setup
bounced her back to the profile page.

There is also a leftover duplicate: the Cook Family member list has "Holly Cook" twice — once with
lavenderlily33@gmail.com and once with hcook@kw.com.

## Answer to your question: no admin needed

Supabase already supports a person changing their own login email: they enter the new address, get
a confirmation link at the **new** address, click it, and the change is done. We just never wired
it into the profile page, and today nothing keeps the contact emails in sync. So the plan is
self-service first, with a supervisor tool as the fallback for people who get stuck.

## The plan

### 1. Self-service: "Change sign-in email" on the profile page (no admin involved)

- A new section on the Group Member Profile page: enter your new address, click send.
- The person receives a confirmation link at the **new** address and clicks it. Their login email
  changes automatically — no admin, no supervisor.
- The page shows clearly: "this changes how you sign in" vs "this is the contact email other
  members see," so the two stop getting mixed up (this distinction already exists in the data; the
  UI just doesn't make it obvious).
- After the link is clicked, a database trigger automatically copies the new login email to that
  person's **contact** email wherever they are the group lead or appear in a member list, and
  removes a duplicate member entry left behind for the same person. This is what fixes Holly's
  class of problem permanently: login email and lead contact email can no longer drift apart.

### 2. Supervisor fallback: one button that changes an email everywhere

For people who can't complete the self-service flow (dead address they can't receive at, confused,
like Holly):

- Upgraded supervisor tool: enter old and new address, see a **preview** of every place the old
  address appears (sign-in account, family group lead, member list, share allocations, work
  weekends, trades, votes, org admin/treasurer/calendar-keeper roles), confirm, and all of it
  changes in one transaction with an audit entry.
- Replaces today's narrow tool that only changes the login and warns you to fix the rest by hand.

### 3. Migrate Holly now

Run the supervisor tool for hcook@kw.com → lavenderlily33@gmail.com. Her sign-in then matches the
Cook Family lead email, Family Group Setup opens normally, and the stale hcook member entry is
removed. She signs in with lavenderlily33@gmail.com from then on.

### 4. Safety net so a mismatch never locks a lead out again

- Lead detection also accepts a **name match** against the group's lead name, not just email.
- Family Group Setup stops bouncing anyone who is a lead by name or who has the "manage the whole
  family group" checkboxes ticked.

## Technical notes

- Self-service: `supabase.auth.updateUser({ email })` from Group Member Profile; Supabase emails
  the confirmation link and applies the change (project email settings may need
  "confirm email change" enabled — I'll verify).
- New trigger on `auth.users` email change: updates `family_groups.lead_email` and
  `host_members` email entries where the old email (or matching name) appears, dedupes
  `host_members` for the same person, logs to `bulk_operation_audit`. Contact email stays as-is
  when it differs intentionally from the login email for non-lead members — the auto-copy applies
  only where the old email was both login and contact (or the person is the lead).
- New `supervisor_change_member_email` function (SECURITY DEFINER, supervisor-only) replacing
  `supervisor_fix_user_email`, plus a read-only preview function; covers `auth.users`,
  `family_groups`, `organizations` role emails, `member_share_allocations.member_email`,
  `trade_requests`, `work_weekends`, `work_weekend_approvals`, `work_weekend_comments`, `votes`,
  `feedback`.
- `src/components/SupervisorUserTools.tsx` becomes preview → confirm.
- `src/hooks/useUserRole.ts`: `setIsGroupLead(!!leadGroup || !!nameMatchedLeadGroup)`;
  `userFamilyGroup` falls back to the name-matched lead group.
- `src/pages/FamilyGroupSetup.tsx` redirect effect (~line 250): skip redirect when the member has
  `canEditReservations` / `canEditDailyFinal` / `canEditStayHistory`.
- Holly's browser "remembering" the old address is autofill; she'll need to pick the new address at
  sign-in once. No code can change a browser's saved form data.
