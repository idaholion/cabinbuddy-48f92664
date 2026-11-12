-- Phase 2: additive preparation only. Run manually in Supabase SQL Editor.
-- Existing calendar code continues to use legacy fields until the next update.
-- No notices are sent. No reservations, turns, usage counts, limits, or opening
-- dates are changed. The normal updated_at trigger may timestamp usage rows.
BEGIN;

-- Prevent handoffs/bookings from racing the preservation check.
LOCK TABLE public.rotation_orders, public.secondary_selection_status,
  public.time_period_usage, public.reservation_periods, public.reservations
  IN SHARE ROW EXCLUSIVE MODE;

-- Stop safely unless BOTH reviewed seasons are still explicitly finished.
DO $$
DECLARE
  yr integer;
BEGIN
  FOREACH yr IN ARRAY ARRAY[2026, 2027] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.rotation_orders r
      JOIN public.secondary_selection_status s
        ON s.organization_id = r.organization_id AND s.rotation_year = r.rotation_year
      WHERE r.organization_id = 'f8882cbd-fc37-4521-bfd2-992dc8eb9a9f'
        AND r.rotation_year = yr
        AND r.current_primary_turn_family IS NULL
        AND s.current_family_group IS NULL
        AND s.started_at IS NOT NULL AND s.turn_completed IS TRUE
        AND jsonb_array_length(r.rotation_order::jsonb) = 6
        AND NOT EXISTS (
          SELECT 1 FROM jsonb_array_elements_text(r.rotation_order::jsonb) AS family(name)
          WHERE NOT EXISTS (
            SELECT 1 FROM public.time_period_usage u
            WHERE u.organization_id = r.organization_id AND u.rotation_year = yr
              AND u.family_group = family.name AND u.turn_completed IS TRUE
          )
        )
    ) THEN
      RAISE EXCEPTION 'Season % is not explicitly finished as reviewed. Nothing has been changed.', yr;
    END IF;
  END LOOP;
END $$;

CREATE TEMP TABLE round_completion_before ON COMMIT DROP AS
SELECT id, to_jsonb(u) - 'primary_turn_completed' - 'secondary_turn_completed' - 'updated_at' AS saved
FROM public.time_period_usage u;

ALTER TABLE public.time_period_usage
  ADD COLUMN IF NOT EXISTS primary_turn_completed boolean,
  ADD COLUMN IF NOT EXISTS secondary_turn_completed boolean;

-- Nullable fields deliberately retain legacy compatibility for other seasons.
-- Only the six families in each reviewed, finished rotation are backfilled.
-- Existing new values are never overwritten on a repeat run.
UPDATE public.time_period_usage u
SET primary_turn_completed = COALESCE(u.primary_turn_completed, true),
    secondary_turn_completed = COALESCE(u.secondary_turn_completed, true)
FROM public.rotation_orders r
WHERE r.organization_id = u.organization_id AND r.rotation_year = u.rotation_year
  AND u.organization_id = 'f8882cbd-fc37-4521-bfd2-992dc8eb9a9f'
  AND u.rotation_year IN (2026, 2027)
  AND u.family_group IN (SELECT jsonb_array_elements_text(r.rotation_order::jsonb))
  AND (u.primary_turn_completed IS NULL OR u.secondary_turn_completed IS NULL);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.time_period_usage u
    FULL JOIN round_completion_before b ON b.id = u.id
    WHERE b.id IS NULL OR u.id IS NULL OR
      b.saved IS DISTINCT FROM (to_jsonb(u) - 'primary_turn_completed' - 'secondary_turn_completed' - 'updated_at')
  ) THEN
    RAISE EXCEPTION 'An existing usage field changed. Rolling back this script.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.time_period_usage u
    JOIN public.rotation_orders r ON r.organization_id = u.organization_id AND r.rotation_year = u.rotation_year
    WHERE u.organization_id = 'f8882cbd-fc37-4521-bfd2-992dc8eb9a9f'
      AND u.rotation_year IN (2026, 2027)
      AND u.family_group IN (SELECT jsonb_array_elements_text(r.rotation_order::jsonb))
      AND (u.primary_turn_completed IS NOT TRUE OR u.secondary_turn_completed IS NOT TRUE)
  ) THEN
    RAISE EXCEPTION 'A reviewed family has conflicting separate completion values. Rolling back; review before proceeding.';
  END IF;
END $$;

-- Expect 12 rows, both completion columns true, including Poznanovich 2027
-- with secondary_periods_used = 0. Bookings are not evidence of completion.
SELECT rotation_year, family_group, primary_turn_completed,
  secondary_turn_completed, time_periods_used, secondary_periods_used
FROM public.time_period_usage
WHERE organization_id = 'f8882cbd-fc37-4521-bfd2-992dc8eb9a9f'
  AND rotation_year IN (2026, 2027)
ORDER BY rotation_year, family_group;

COMMIT;