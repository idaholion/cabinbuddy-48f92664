-- ============ Phase 1: Origin tracking ============

-- Template source flag on organizations
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS is_template_source boolean NOT NULL DEFAULT false;

-- Origin-tracking columns on org-scoped content tables
ALTER TABLE public.cabin_rules ADD COLUMN IF NOT EXISTS source_template_id uuid, ADD COLUMN IF NOT EXISTS customized_at timestamptz;
ALTER TABLE public.custom_checklists ADD COLUMN IF NOT EXISTS source_template_id uuid, ADD COLUMN IF NOT EXISTS customized_at timestamptz;
ALTER TABLE public.reminder_templates ADD COLUMN IF NOT EXISTS source_template_id uuid, ADD COLUMN IF NOT EXISTS customized_at timestamptz;
ALTER TABLE public.faq_items ADD COLUMN IF NOT EXISTS source_template_id uuid, ADD COLUMN IF NOT EXISTS customized_at timestamptz;

-- Trigger: when a row that was copied from a template (source_template_id set) is edited
-- in any way other than the bookkeeping/timestamp columns, mark it customized.
-- NOTE: the future Phase-3 push tool (service role) must reset customized_at to NULL
-- explicitly after overwriting a pristine copy.
CREATE OR REPLACE FUNCTION public.mark_template_copy_customized()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  new_j jsonb;
  old_j jsonb;
BEGIN
  -- Template-source rows and org-specific rows are never "customized copies"
  IF OLD.source_template_id IS NULL THEN
    RETURN NEW;
  END IF;
  new_j := to_jsonb(NEW) - 'customized_at' - 'updated_at' - 'source_template_id';
  old_j := to_jsonb(OLD) - 'customized_at' - 'updated_at' - 'source_template_id';
  IF new_j IS DISTINCT FROM old_j THEN
    NEW.customized_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cabin_rules_customized ON public.cabin_rules;
CREATE TRIGGER trg_cabin_rules_customized BEFORE UPDATE ON public.cabin_rules FOR EACH ROW EXECUTE FUNCTION public.mark_template_copy_customized();
DROP TRIGGER IF EXISTS trg_custom_checklists_customized ON public.custom_checklists;
CREATE TRIGGER trg_custom_checklists_customized BEFORE UPDATE ON public.custom_checklists FOR EACH ROW EXECUTE FUNCTION public.mark_template_copy_customized();
DROP TRIGGER IF EXISTS trg_reminder_templates_customized ON public.reminder_templates;
CREATE TRIGGER trg_reminder_templates_customized BEFORE UPDATE ON public.reminder_templates FOR EACH ROW EXECUTE FUNCTION public.mark_template_copy_customized();
DROP TRIGGER IF EXISTS trg_faq_items_customized ON public.faq_items;
CREATE TRIGGER trg_faq_items_customized BEFORE UPDATE ON public.faq_items FOR EACH ROW EXECUTE FUNCTION public.mark_template_copy_customized();

-- Mark the Andrew Family Cabin as the template source
UPDATE public.organizations SET is_template_source = true WHERE id = 'f8882cbd-fc37-4521-bfd2-992dc8eb9a9f';

-- Backfill: label pristine copies (exact content match with the template source).
-- Anything that does not match exactly keeps source_template_id NULL (treated as customized/org-specific).

UPDATE public.cabin_rules c
SET source_template_id = t.id
FROM public.cabin_rules t
JOIN public.organizations o ON o.id = t.organization_id AND o.is_template_source
WHERE c.organization_id <> t.organization_id
  AND c.source_template_id IS NULL
  AND c.section_type = t.section_type
  AND md5(c.section_title) = md5(t.section_title)
  AND md5(c.content::text) = md5(t.content::text);

UPDATE public.custom_checklists c
SET source_template_id = t.id
FROM public.custom_checklists t
JOIN public.organizations o ON o.id = t.organization_id AND o.is_template_source
WHERE c.organization_id <> t.organization_id
  AND c.source_template_id IS NULL
  AND c.checklist_type = t.checklist_type
  AND md5(c.items::text) = md5(t.items::text)
  AND md5(coalesce(c.introductory_text, '')) = md5(coalesce(t.introductory_text, ''))
  AND md5(coalesce(c.images::text, 'null')) = md5(coalesce(t.images::text, 'null'));

UPDATE public.reminder_templates c
SET source_template_id = t.id
FROM public.reminder_templates t
JOIN public.organizations o ON o.id = t.organization_id AND o.is_template_source
WHERE c.organization_id <> t.organization_id
  AND c.source_template_id IS NULL
  AND c.reminder_type = t.reminder_type
  AND coalesce(c.trigger_event, '') = coalesce(t.trigger_event, '')
  AND coalesce(c.days_in_advance, -1) = coalesce(t.days_in_advance, -1)
  AND md5(coalesce(c.subject_template, '')) = md5(coalesce(t.subject_template, ''))
  AND md5(coalesce(c.custom_message, '')) = md5(coalesce(t.custom_message, ''))
  AND md5(coalesce(c.sms_message_template, '')) = md5(coalesce(t.sms_message_template, ''))
  AND md5(coalesce(c.checklist_items::text, 'null')) = md5(coalesce(t.checklist_items::text, 'null'));

UPDATE public.faq_items c
SET source_template_id = t.id
FROM public.faq_items t
JOIN public.organizations o ON o.id = t.organization_id AND o.is_template_source
WHERE c.organization_id <> t.organization_id
  AND c.source_template_id IS NULL
  AND c.question = t.question
  AND md5(c.answer) = md5(t.answer)
  AND md5(coalesce(c.category, '')) = md5(coalesce(t.category, ''));

-- ============ Phase 2: Seed new orgs from the template ============

CREATE OR REPLACE FUNCTION public.seed_organization_content_from_template(p_org_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  src uuid;
BEGIN
  SELECT id INTO src FROM public.organizations WHERE is_template_source LIMIT 1;
  IF src IS NULL OR src = p_org_id THEN
    RETURN;
  END IF;

  -- Only seed tables the new org does not already have rows in (prevents duplicates on re-run)
  IF NOT EXISTS (SELECT 1 FROM public.cabin_rules WHERE organization_id = p_org_id) THEN
    INSERT INTO public.cabin_rules (organization_id, section_type, section_title, content, source_template_id)
    SELECT p_org_id, section_type, section_title, content, id
    FROM public.cabin_rules WHERE organization_id = src;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.custom_checklists WHERE organization_id = p_org_id) THEN
    INSERT INTO public.custom_checklists (organization_id, checklist_type, items, images, introductory_text, source_template_id)
    SELECT p_org_id, checklist_type, items, images, introductory_text, id
    FROM public.custom_checklists WHERE organization_id = src;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.faq_items WHERE organization_id = p_org_id) THEN
    INSERT INTO public.faq_items (organization_id, category, question, answer, category_order, item_order, source_template_id)
    SELECT p_org_id, category, question, answer, category_order, item_order, id
    FROM public.faq_items WHERE organization_id = src;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.reminder_templates WHERE organization_id = p_org_id) THEN
    INSERT INTO public.reminder_templates (organization_id, reminder_type, subject_template, checklist_items, custom_message, sort_order, days_in_advance, is_active, sms_message_template, trigger_event, delivery_method, source_template_id)
    SELECT p_org_id, reminder_type, subject_template, checklist_items, custom_message, sort_order, days_in_advance, is_active, sms_message_template, trigger_event, delivery_method, id
    FROM public.reminder_templates WHERE organization_id = src;
  END IF;
END;
$$;

-- Internal-only: called from create_organization_with_user_link (security definer chain)
REVOKE EXECUTE ON FUNCTION public.seed_organization_content_from_template(uuid) FROM public, anon, authenticated;

-- Wire seeding into organization creation
CREATE OR REPLACE FUNCTION public.create_organization_with_user_link(p_name text, p_code text, p_admin_name text DEFAULT NULL::text, p_admin_email text DEFAULT NULL::text, p_admin_phone text DEFAULT NULL::text, p_treasurer_name text DEFAULT NULL::text, p_treasurer_email text DEFAULT NULL::text, p_treasurer_phone text DEFAULT NULL::text, p_calendar_keeper_name text DEFAULT NULL::text, p_calendar_keeper_email text DEFAULT NULL::text, p_calendar_keeper_phone text DEFAULT NULL::text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_user_id uuid;
  new_org_id uuid;
  existing_org_count integer;
BEGIN
  SELECT auth.uid() INTO current_user_id;
  IF current_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not authenticated');
  END IF;
  IF p_name IS NULL OR p_name = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Organization name is required');
  END IF;
  IF p_code IS NULL OR p_code = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Organization code is required');
  END IF;
  SELECT COUNT(*) INTO existing_org_count FROM organizations WHERE code = p_code;
  IF existing_org_count > 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'An organization with this code already exists. Please choose a different code.');
  END IF;

  INSERT INTO organizations (name, code, admin_name, admin_email, admin_phone, treasurer_name, treasurer_email, treasurer_phone, calendar_keeper_name, calendar_keeper_email, calendar_keeper_phone)
  VALUES (p_name, p_code, p_admin_name, p_admin_email, p_admin_phone, p_treasurer_name, p_treasurer_email, p_treasurer_phone, p_calendar_keeper_name, p_calendar_keeper_email, p_calendar_keeper_phone)
  RETURNING id INTO new_org_id;

  INSERT INTO user_organizations (user_id, organization_id, role, is_primary)
  VALUES (current_user_id, new_org_id, 'admin', true);

  -- Seed tracked content copies from the template source (no-op if none configured)
  PERFORM public.seed_organization_content_from_template(new_org_id);

  RETURN jsonb_build_object(
    'success', true,
    'organization_id', new_org_id,
    'organization_name', p_name,
    'organization_code', p_code,
    'message', 'Organization created successfully'
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Failed to create organization: ' || SQLERRM,
      'error_code', SQLSTATE
    );
END;
$function$;