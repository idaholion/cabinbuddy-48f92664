-- Phase 1: dedicated CabinBuddy Master Template organization.
-- Safe: does not edit any Andrew or Paul content, reservations, or settings.
BEGIN;

-- 1. Create the template org (only once).
INSERT INTO public.organizations (name, code, is_template_source)
SELECT 'CabinBuddy Master Template', public.generate_unique_organization_code('CBMASTER'), false
WHERE NOT EXISTS (SELECT 1 FROM public.organizations WHERE name = 'CabinBuddy Master Template');

-- 2. Start it with a copy of today's starter content so new cabins get exactly
--    what they get now. Phase 3 will clean out Andrew-specific wording.
SELECT set_config('cb.tpl', (SELECT id::text FROM public.organizations WHERE name = 'CabinBuddy Master Template'), true);

INSERT INTO public.cabin_rules (organization_id, section_type, section_title, content)
SELECT current_setting('cb.tpl')::uuid, section_type, section_title, content
FROM public.cabin_rules WHERE organization_id = 'f8882cbd-fc37-4521-bfd2-992dc8eb9a9f'
  AND NOT EXISTS (SELECT 1 FROM public.cabin_rules WHERE organization_id = current_setting('cb.tpl')::uuid);

INSERT INTO public.custom_checklists (organization_id, checklist_type, items, images, introductory_text)
SELECT current_setting('cb.tpl')::uuid, checklist_type, items, images, introductory_text
FROM public.custom_checklists WHERE organization_id = 'f8882cbd-fc37-4521-bfd2-992dc8eb9a9f'
  AND NOT EXISTS (SELECT 1 FROM public.custom_checklists WHERE organization_id = current_setting('cb.tpl')::uuid);

INSERT INTO public.faq_items (organization_id, category, question, answer, category_order, item_order)
SELECT current_setting('cb.tpl')::uuid, category, question, answer, category_order, item_order
FROM public.faq_items WHERE organization_id = 'f8882cbd-fc37-4521-bfd2-992dc8eb9a9f'
  AND NOT EXISTS (SELECT 1 FROM public.faq_items WHERE organization_id = current_setting('cb.tpl')::uuid);

INSERT INTO public.reminder_templates (organization_id, reminder_type, subject_template, checklist_items, custom_message, sort_order, days_in_advance, is_active, sms_message_template, trigger_event, delivery_method)
SELECT current_setting('cb.tpl')::uuid, reminder_type, subject_template, checklist_items, custom_message, sort_order, days_in_advance, is_active, sms_message_template, trigger_event, delivery_method
FROM public.reminder_templates WHERE organization_id = 'f8882cbd-fc37-4521-bfd2-992dc8eb9a9f'
  AND NOT EXISTS (SELECT 1 FROM public.reminder_templates WHERE organization_id = current_setting('cb.tpl')::uuid);

-- 3. Move the "template source" flag from Andrew to the Master Template.
UPDATE public.organizations SET is_template_source = false WHERE is_template_source AND name <> 'CabinBuddy Master Template';
UPDATE public.organizations SET is_template_source = true  WHERE name = 'CabinBuddy Master Template';

-- 4. Guarantee only one template source can ever exist.
CREATE UNIQUE INDEX IF NOT EXISTS organizations_single_template_source
  ON public.organizations (is_template_source) WHERE is_template_source;

COMMIT;

-- Check: expect one row "CabinBuddy Master Template" with counts > 0
SELECT o.name, o.is_template_source,
  (SELECT count(*) FROM public.cabin_rules r WHERE r.organization_id=o.id) rules,
  (SELECT count(*) FROM public.custom_checklists c WHERE c.organization_id=o.id) checklists,
  (SELECT count(*) FROM public.faq_items f WHERE f.organization_id=o.id) faqs,
  (SELECT count(*) FROM public.reminder_templates t WHERE t.organization_id=o.id) reminders
FROM public.organizations o WHERE o.is_template_source;
