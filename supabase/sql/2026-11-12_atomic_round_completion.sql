-- Run manually AFTER separate_round_completion.sql.
-- Installs compatibility triggers; no current rows are updated and no notices
-- are sent. Future handoffs record completion in the same transaction.
BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'time_period_usage'
      AND column_name = 'secondary_turn_completed') THEN
    RAISE EXCEPTION 'Run the separate completion fields script first.';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.sync_primary_round_completion()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.primary_turn_completed := COALESCE(NEW.primary_turn_completed, NEW.turn_completed, false);
    NEW.secondary_turn_completed := COALESCE(NEW.secondary_turn_completed, false);
  ELSE
    -- Existing primary Done/expiry paths remain compatible during rollout.
    IF NEW.turn_completed IS TRUE AND OLD.turn_completed IS DISTINCT FROM TRUE THEN
      NEW.primary_turn_completed := true;
    END IF;
    -- Count-only updates must not undo either round's saved completion.
    IF OLD.primary_turn_completed IS TRUE AND NEW.primary_turn_completed IS DISTINCT FROM TRUE THEN
      RAISE EXCEPTION 'A completed primary turn cannot be reset.';
    END IF;
    IF OLD.secondary_turn_completed IS TRUE AND NEW.secondary_turn_completed IS DISTINCT FROM TRUE THEN
      RAISE EXCEPTION 'A completed secondary turn cannot be reset.';
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS sync_primary_round_completion ON public.time_period_usage;
CREATE TRIGGER sync_primary_round_completion
BEFORE INSERT OR UPDATE ON public.time_period_usage
FOR EACH ROW EXECUTE FUNCTION public.sync_primary_round_completion();

CREATE OR REPLACE FUNCTION public.record_secondary_round_handoff()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE
  changed integer;
BEGIN
  -- A same-family extension or repeated save is not a handoff.
  IF OLD.current_family_group IS NOT NULL AND OLD.started_at IS NOT NULL
    AND (NEW.current_family_group IS DISTINCT FROM OLD.current_family_group
      OR (NEW.turn_completed IS TRUE AND OLD.turn_completed IS DISTINCT FROM TRUE)) THEN
    UPDATE public.time_period_usage
      SET secondary_turn_completed = true
      WHERE organization_id = OLD.organization_id
        AND rotation_year = OLD.rotation_year
        AND family_group = OLD.current_family_group;
    GET DIAGNOSTICS changed = ROW_COUNT;
    IF changed <> 1 THEN
      RAISE EXCEPTION 'Secondary completion record missing or inaccessible. Handoff rolled back.';
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS record_secondary_round_handoff ON public.secondary_selection_status;
CREATE TRIGGER record_secondary_round_handoff
AFTER UPDATE ON public.secondary_selection_status
FOR EACH ROW EXECUTE FUNCTION public.record_secondary_round_handoff();

-- Trigger-only functions: no new browser-callable privileged operations.
REVOKE ALL ON FUNCTION public.sync_primary_round_completion() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.record_secondary_round_handoff() FROM PUBLIC, anon, authenticated;

SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND trigger_name IN ('sync_primary_round_completion', 'record_secondary_round_handoff')
ORDER BY trigger_name, event_manipulation;

COMMIT;