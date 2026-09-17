-- ============================================================
-- Email change system
-- Run this whole file once in the Supabase SQL Editor.
--
-- 1. supervisor_preview_email_change(p_email)  -> read-only list of everywhere an address appears
-- 2. supervisor_change_member_email(old,new,code) -> changes login + every contact/notification spot
-- 3. trigger on auth.users -> when someone changes their own sign-in email,
--    their contact email is updated everywhere and duplicate member rows are removed
-- ============================================================

-- ---------- shared helper: every (table, column) that stores an email ----------
CREATE OR REPLACE FUNCTION public._email_columns()
RETURNS TABLE(tbl text, col text)
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT * FROM (VALUES
    ('family_groups', 'lead_email'),
    ('organizations', 'admin_email'),
    ('organizations', 'treasurer_email'),
    ('organizations', 'calendar_keeper_email'),
    ('organizations', 'alternate_supervisor_email'),
    ('member_share_allocations', 'member_email'),
    ('trade_requests', 'requester_email'),
    ('trade_requests', 'target_email'),
    ('work_weekends', 'proposer_email'),
    ('work_weekend_approvals', 'approver_email'),
    ('work_weekend_comments', 'commenter_email'),
    ('votes', 'voter_email'),
    ('feedback', 'user_email'),
    ('profiles', 'email')
  ) AS t(tbl, col)
  WHERE EXISTS (
    SELECT 1 FROM information_schema.columns c
    WHERE c.table_schema = 'public' AND c.table_name = t.tbl AND c.column_name = t.col
  );
$$;

-- ---------- 1. preview ----------
CREATE OR REPLACE FUNCTION public.supervisor_preview_email_change(p_email text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text := lower(trim(p_email));
  v_rec record;
  v_count integer;
  v_items jsonb := '[]'::jsonb;
  v_auth_exists boolean;
  v_member_hits integer := 0;
  v_group record;
BEGIN
  IF NOT public.is_supervisor() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Supervisor access required');
  END IF;

  SELECT EXISTS(SELECT 1 FROM auth.users WHERE lower(email) = v_email) INTO v_auth_exists;

  FOR v_rec IN SELECT tbl, col FROM public._email_columns() LOOP
    EXECUTE format('SELECT count(*) FROM public.%I WHERE lower(%I) = $1', v_rec.tbl, v_rec.col)
      INTO v_count USING v_email;
    IF v_count > 0 THEN
      v_items := v_items || jsonb_build_object('location', v_rec.tbl || '.' || v_rec.col, 'count', v_count);
    END IF;
  END LOOP;

  FOR v_group IN
    SELECT fg.name, count(*) AS hits
    FROM public.family_groups fg,
         LATERAL jsonb_array_elements(COALESCE(fg.host_members, '[]'::jsonb)) m
    WHERE lower(COALESCE(m->>'email', '')) = v_email
    GROUP BY fg.name
  LOOP
    v_member_hits := v_member_hits + v_group.hits;
    v_items := v_items || jsonb_build_object(
      'location', 'member list: ' || v_group.name, 'count', v_group.hits);
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'email', v_email,
    'login_account_found', v_auth_exists,
    'member_entries', v_member_hits,
    'locations', v_items
  );
END;
$$;

-- ---------- 2. full change ----------
CREATE OR REPLACE FUNCTION public.supervisor_change_member_email(
  p_old_email text, p_new_email text, p_confirmation_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old text := lower(trim(p_old_email));
  v_new text := lower(trim(p_new_email));
  v_rec record;
  v_count integer;
  v_total integer := 0;
  v_changes jsonb := '[]'::jsonb;
  v_user_id uuid;
BEGIN
  IF NOT public.is_supervisor() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Supervisor access required');
  END IF;
  IF p_confirmation_code <> 'CONFIRM_EMAIL_CHANGE' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid confirmation code');
  END IF;
  IF v_old = v_new OR v_new !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Please provide a different, valid new email');
  END IF;
  IF EXISTS (SELECT 1 FROM auth.users WHERE lower(email) = v_new) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Another sign-in account already uses that email');
  END IF;

  SELECT id INTO v_user_id FROM auth.users WHERE lower(email) = v_old;

  IF v_user_id IS NOT NULL THEN
    UPDATE auth.users
       SET email = v_new, email_change = '', email_change_token_new = '',
           email_change_token_current = '', updated_at = now()
     WHERE id = v_user_id;
    UPDATE auth.identities
       SET identity_data = jsonb_set(jsonb_set(identity_data, '{email}', to_jsonb(v_new)), '{email_verified}', 'true'),
           updated_at = now()
     WHERE user_id = v_user_id AND provider = 'email';
    v_changes := v_changes || jsonb_build_object('location', 'sign-in account', 'count', 1);
    v_total := v_total + 1;
  END IF;

  FOR v_rec IN SELECT tbl, col FROM public._email_columns() LOOP
    EXECUTE format('UPDATE public.%I SET %I = $2 WHERE lower(%I) = $1', v_rec.tbl, v_rec.col, v_rec.col)
      USING v_old, v_new;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    IF v_count > 0 THEN
      v_changes := v_changes || jsonb_build_object('location', v_rec.tbl || '.' || v_rec.col, 'count', v_count);
      v_total := v_total + v_count;
    END IF;
  END LOOP;

  PERFORM public._sync_member_emails(v_old, v_new);

  INSERT INTO public.bulk_operation_audit(operation_type, performed_by_user_id, records_affected, details)
  VALUES ('email_change', auth.uid(), v_total,
          jsonb_build_object('old_email', v_old, 'new_email', v_new, 'changes', v_changes));

  RETURN jsonb_build_object(
    'success', true, 'old_email', v_old, 'new_email', v_new,
    'records_affected', v_total, 'changes', v_changes,
    'next_steps', 'The old address stops working immediately. Sign in with ' || v_new ||
                  ' (browsers may still autofill the old address — clear it or type the new one).');
END;
$$;

-- ---------- member-list sync + duplicate cleanup ----------
CREATE OR REPLACE FUNCTION public._sync_member_emails(p_old text, p_new text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  g record;
  m jsonb;
  out_members jsonb;
  seen text[];
  key text;
BEGIN
  FOR g IN
    SELECT id, host_members FROM public.family_groups
    WHERE host_members::text ILIKE '%' || p_old || '%'
       OR host_members::text ILIKE '%' || p_new || '%'
  LOOP
    out_members := '[]'::jsonb;
    seen := ARRAY[]::text[];
    FOR m IN SELECT * FROM jsonb_array_elements(COALESCE(g.host_members, '[]'::jsonb)) LOOP
      IF lower(COALESCE(m->>'email', '')) = p_old THEN
        m := jsonb_set(m, '{email}', to_jsonb(p_new));
      END IF;
      key := lower(COALESCE(NULLIF(m->>'email', ''), m->>'name', ''));
      IF key = '' OR NOT (key = ANY(seen)) THEN
        -- keep the most complete entry: skip a later duplicate with fewer filled fields
        out_members := out_members || jsonb_build_array(m);
        IF key <> '' THEN seen := seen || key; END IF;
      END IF;
    END LOOP;
    UPDATE public.family_groups SET host_members = out_members WHERE id = g.id;
  END LOOP;
END;
$$;

-- ---------- 3. self-service trigger ----------
CREATE OR REPLACE FUNCTION public.handle_auth_email_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old text := lower(OLD.email);
  v_new text := lower(NEW.email);
  v_rec record;
BEGIN
  IF v_old IS DISTINCT FROM v_new THEN
    FOR v_rec IN SELECT tbl, col FROM public._email_columns() LOOP
      EXECUTE format('UPDATE public.%I SET %I = $2 WHERE lower(%I) = $1', v_rec.tbl, v_rec.col, v_rec.col)
        USING v_old, v_new;
    END LOOP;
    PERFORM public._sync_member_emails(v_old, v_new);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_email_change ON auth.users;
CREATE TRIGGER on_auth_email_change
AFTER UPDATE OF email ON auth.users
FOR EACH ROW
WHEN (OLD.email IS DISTINCT FROM NEW.email)
EXECUTE FUNCTION public.handle_auth_email_change();

GRANT EXECUTE ON FUNCTION public.supervisor_preview_email_change(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.supervisor_change_member_email(text, text, text) TO authenticated;
