-- Phase 2 step 1: make saved numbers match what the app already uses.
-- Changes only settings and finished selection-window flags. No reservations,
-- usage counts, rotation order, or second-round status are touched.
BEGIN;

-- Round 1 picks (app already treats 0 as 2) and Round 2 picks (app treats 0 as 1)
UPDATE public.rotation_orders
SET max_time_slots = 2
WHERE organization_id = 'f8882cbd-fc37-4521-bfd2-992dc8eb9a9f'
  AND rotation_year IN (2026, 2027) AND COALESCE(max_time_slots, 0) = 0;

UPDATE public.rotation_orders
SET secondary_max_periods = 1
WHERE organization_id = 'f8882cbd-fc37-4521-bfd2-992dc8eb9a9f'
  AND rotation_year IN (2026, 2027) AND COALESCE(secondary_max_periods, 0) = 0;

-- Round 1 windows that are long over but still flagged "not completed"
UPDATE public.reservation_periods
SET reservations_completed = true, updated_at = now()
WHERE organization_id = 'f8882cbd-fc37-4521-bfd2-992dc8eb9a9f'
  AND rotation_year IN (2026, 2027)
  AND COALESCE(reservations_completed, false) = false
  AND selection_end_date < CURRENT_DATE;

-- Expect: 2 rows each with 2 / 1, and every period row = true
SELECT rotation_year, max_time_slots, secondary_max_periods
FROM public.rotation_orders
WHERE organization_id = 'f8882cbd-fc37-4521-bfd2-992dc8eb9a9f' AND rotation_year IN (2026, 2027);
SELECT rotation_year, current_family_group, selection_start_date, selection_end_date, reservations_completed
FROM public.reservation_periods
WHERE organization_id = 'f8882cbd-fc37-4521-bfd2-992dc8eb9a9f' AND rotation_year IN (2026, 2027)
ORDER BY rotation_year, selection_start_date;

COMMIT;
