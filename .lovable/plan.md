# Template Organization + Supervisor Editing Scope

## The short advice

You're close, but one of the four modes in your idea doesn't belong. Here's the cleaner split:

- **"Standard change" / typo fixes** — these are almost always *app text baked into the pages*, not organization data. Those already change for everyone the moment I edit them. You don't need a mode for that, and putting it in a scope switcher would be misleading (it would imply the switch controls something it doesn't).
- **"Andrew Organization only" vs "Template Organization only"** — this is real and worth a switcher. It's just "which organization am I editing right now," which is exactly what the existing organization switcher does. It only needs to learn about the hidden template org.
- **"All Organizations"** — this is the dangerous one. A live always-on mode where a keystroke writes into Paul's data is how checklists get clobbered. This should never be a mode you can be sitting in; it should be a deliberate action with a preview and a confirm.

So: **two modes in the sidebar, plus one separate push screen.**

## What gets built

### 1. Template organization

Create a hidden organization ("CabinBuddy Template"), seeded from Andrew's current content, and move the template flag onto it. Andrew's org becomes a normal organization again — free to say "no dogs" or anything else without that leaking into new signups. New organizations then seed from the template org.

The template org is hidden from normal listings (it never appears in member-facing lists, join flows, or supervisor org counts as a real cabin) and is only reachable by you.

### 2. Sidebar scope indicator (supervisor only)

Directly under Home, a small control visible only in Supervisor Mode:

```text
Editing: [ Andrew Family        v ]
         --------------------------
         Andrew Family
         Paul's Cabin
         Template (new orgs)      <- amber highlight
```

- Switching to Template puts you in the template org: Cabin Rules, Checklists, FAQ, Reminder Templates all show and edit template content.
- While in Template scope, a persistent amber banner reads "Editing the new-organization template — changes affect future organizations only."
- Non-supervisors never see this control and can't reach the template org.

### 3. "Push to organizations" — a screen, not a mode

A supervisor-only page reached from the template org. Pick a section (e.g. Cabin Rules → General Rules), and it shows per organization:

| Organization | Status | Action |
|---|---|---|
| Andrew Family | Customized | Skipped — shows their version |
| Paul's Cabin | Unchanged since seeding | Eligible — shows before/after |

Push only writes to rows that are provably untouched (`source_template_id` matches and `customized_at IS NULL`). Customized rows are listed but never eligible for automatic overwrite. Nothing is written until you confirm the preview, and every push is logged.

This is the safety valve for your "I found a typo in the cabin rules and want it fixed everywhere" case — it fixes it everywhere it's safe to, and shows you exactly where it didn't.

## What this deliberately does not do

- No live "All Organizations" editing mode.
- No pushing of family groups, contacts, reservations, payments, receipts, or any operational data — the push tool only ever touches the content tables.
- No change to how Andrew's or Paul's organizations behave day to day.

## Technical notes

- Phase 1 groundwork is already in place: `organizations.is_template_source`, plus `source_template_id` / `customized_at` on `cabin_rules`, `custom_checklists`, `reminder_templates`, and `faq_items`, with the edit-detection trigger and the `seed_organization_content_from_template` function.
- Migration: add `organizations.is_hidden_template` (or reuse an existing hidden/test flag), create the template org row, run seeding from Andrew into it, then move `is_template_source` to it. Filter the template org out of `get_user_organizations` results for non-supervisors.
- Sidebar: new `EditingScopeSwitcher` component in `AppSidebar.tsx` under the Home item, gated on `useSupervisor()` + supervisor mode, driving the existing organization switch path so all content hooks follow automatically.
- Push tool: supervisor-only page plus a service-role edge function with a required dry-run preview step; writes an audit row per push.

## Suggested order

1. Template org + hiding + flag move (invisible to everyone else).
2. Sidebar scope switcher.
3. Push screen — only once you actually have a change you want to propagate.
