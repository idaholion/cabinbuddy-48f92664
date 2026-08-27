# Template Layer for Org Content — Phased, Low-Risk Setup

## Goal

Stop treating the Andrew Family org as the informal "default." Introduce an explicit template layer so future improvements to default content (cabin rules, checklists, reminder templates, FAQ) can be pushed to organizations **without ever overwriting content an org has customized.**

## How the system works today (confirmed understanding)

- **Code/functionality changes** (pages, edge functions, database policies) are shared — one change affects all organizations at once.
- **Org data** (cabin rules text, checklists, reminder templates, etc.) is scoped per `organization_id` — editing Andrew's data never touches the Pauls' data, and vice versa.
- The missing piece: when a new org is created, its starting content is a *copy* with no record of where it came from. That is what this plan fixes.

## Phase 1 — Origin tracking (no behavior change, zero risk to existing data)

Add two columns to the org-scoped content tables (`cabin_rules`, `custom_checklists`, `reminder_templates`, `faq_items`/`cb_faq_items`, plus `reservation_settings.payment_methods_config` handling):

- `source_template_id` — which template/default row this content originated from (NULL = org-specific, never touched by any sync).
- `customized_at` — timestamp set automatically by a trigger whenever an org edits a row.

Backfill existing rows:
- Andrew org rows → marked as the template source themselves.
- Pauls org rows → compared by content checksum against Andrew's rows; identical rows get `source_template_id` set and `customized_at` NULL (pristine), differing rows get `source_template_id` NULL (treated as customized — conservative, never at risk).

**Impact: none.** No page, function, or org workflow changes. This is bookkeeping only.

## Phase 2 — Seeding new orgs from the template

When a new organization is created, copy content from the designated template source (the Andrew org for now, flagged via `organizations.is_template_source = true`, or a dedicated hidden template org later) and stamp every copied row with its `source_template_id`.

This replaces today's implicit copy behavior with a tracked copy. New orgs get the same starting content they would have anyway — the only difference is provenance is recorded.

## Phase 3 (later, opt-in) — "Push template updates" admin tool

A Supervisor-only screen that:

1. Shows a diff of template rows vs. each org's copies.
2. Offers "Push to orgs" which updates **only** rows where `customized_at IS NULL` and `source_template_id` matches — i.e., provably unmodified copies.
3. Lists skipped (customized) rows per org, with the option to view but never auto-overwrite them.

This phase is deliberately deferred — Phases 1–2 are safe to do now with 2 orgs; Phase 3 can wait until you actually need to push a change.

## What this can NOT mess up

- Existing org data: Phase 1 only *reads* and *labels*; the backfill never rewrites content, and customized rows are marked conservatively (when in doubt, "customized").
- Runtime behavior: no changes to RLS, edge functions, or pages in Phases 1–2 beyond the new-org seeding path.
- The Andrew org keeps working exactly as today and remains your live editing environment until/unless we promote a dedicated template org.

## Technical details

- Migration adds: `source_template_id UUID`, `customized_at TIMESTAMPTZ` columns; a `BEFORE UPDATE` trigger setting `customized_at = now()` on content change; `organizations.is_template_source BOOLEAN DEFAULT false`.
- Backfill via checksum: `md5(content::text)` comparison between Pauls rows and Andrew rows per table/section_type.
- New-org seeding: extend `create_organization_with_user_link` RPC (or follow-up insert) to copy template rows with provenance stamps.
- Phase 3 push tool: Supervisor-only edge function using service role, with dry-run preview.
