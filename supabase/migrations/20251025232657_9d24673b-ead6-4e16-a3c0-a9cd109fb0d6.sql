-- Fix 2026 reservation_periods table with correct dates and sequence
-- This only affects the reservation_periods table (selection period tracking)
-- Does NOT touch reservations, time_period_usage, rotation_orders, or family_groups

-- Step 1: Delete all existing 2026 reservation_periods records
DELETE FROM reservation_periods
WHERE organization_id = 'f8882cbd-fc37-4521-bfd2-992dc8eb9a9f'
  AND rotation_year = 2026;

-- Step 2: Insert correct records with proper sequence and dates

-- Comeau Family (completed Oct 10)
INSERT INTO reservation_periods (
  organization_id, rotation_year, current_group_index, current_family_group,
  selection_start_date, selection_end_date, reservations_completed
) VALUES (
  'f8882cbd-fc37-4521-bfd2-992dc8eb9a9f', 2026, 0, 'Comeau Family',
  '2025-10-01', '2025-10-14', true
);

-- Poznanovich Family (completed Oct 14)
INSERT INTO reservation_periods (
  organization_id, rotation_year, current_group_index, current_family_group,
  selection_start_date, selection_end_date, reservations_completed
) VALUES (
  'f8882cbd-fc37-4521-bfd2-992dc8eb9a9f', 2026, 1, 'Poznanovich Family',
  '2025-10-10', '2025-10-23', true
);

-- Woolf Family (completed Oct 17)
INSERT INTO reservation_periods (
  organization_id, rotation_year, current_group_index, current_family_group,
  selection_start_date, selection_end_date, reservations_completed
) VALUES (
  'f8882cbd-fc37-4521-bfd2-992dc8eb9a9f', 2026, 2, 'Woolf Family',
  '2025-10-14', '2025-10-27', true
);

-- Cook Family (completed Oct 20)
INSERT INTO reservation_periods (
  organization_id, rotation_year, current_group_index, current_family_group,
  selection_start_date, selection_end_date, reservations_completed
) VALUES (
  'f8882cbd-fc37-4521-bfd2-992dc8eb9a9f', 2026, 3, 'Cook Family',
  '2025-10-17', '2025-10-30', true
);

-- Andrew Family (currently selecting)
INSERT INTO reservation_periods (
  organization_id, rotation_year, current_group_index, current_family_group,
  selection_start_date, selection_end_date, reservations_completed
) VALUES (
  'f8882cbd-fc37-4521-bfd2-992dc8eb9a9f', 2026, 4, 'Andrew Family',
  '2025-10-20', '2025-11-02', false
);

-- Grandy Family (waiting)
INSERT INTO reservation_periods (
  organization_id, rotation_year, current_group_index, current_family_group,
  selection_start_date, selection_end_date, reservations_completed
) VALUES (
  'f8882cbd-fc37-4521-bfd2-992dc8eb9a9f', 2026, 5, 'Grandy Family',
  '2025-11-02', '2025-11-15', false
);