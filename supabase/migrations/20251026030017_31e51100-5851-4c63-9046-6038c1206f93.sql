-- Add missing reservation_periods entries for Andrew and Grandy families for 2026
-- Andrew Family is current (started Oct 20, ends Nov 2)
INSERT INTO reservation_periods (
  organization_id,
  rotation_year,
  current_family_group,
  current_group_index,
  selection_start_date,
  selection_end_date,
  reservations_completed
) VALUES (
  'f8882cbd-fc37-4521-bfd2-992dc8eb9a9f',
  2026,
  'Andrew Family',
  4,
  '2025-10-20',
  '2025-11-02',
  false
);

-- Grandy Family is next (will start Nov 3, ends Nov 16)
INSERT INTO reservation_periods (
  organization_id,
  rotation_year,
  current_family_group,
  current_group_index,
  selection_start_date,
  selection_end_date,
  reservations_completed
) VALUES (
  'f8882cbd-fc37-4521-bfd2-992dc8eb9a9f',
  2026,
  'Grandy Family',
  5,
  '2025-11-03',
  '2025-11-16',
  false
);