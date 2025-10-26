-- Delete ALL reservation_periods for 2026 and recreate them correctly
-- This will clean up duplicates and ensure correct dates
DELETE FROM reservation_periods 
WHERE organization_id = 'f8882cbd-fc37-4521-bfd2-992dc8eb9a9f' 
AND rotation_year = 2026;

-- Recreate the complete set for 2026 with correct dates
INSERT INTO reservation_periods (organization_id, rotation_year, current_family_group, current_group_index, selection_start_date, selection_end_date, reservations_completed) VALUES
('f8882cbd-fc37-4521-bfd2-992dc8eb9a9f', 2026, 'Comeau Family', 0, '2025-10-01', '2025-10-14', true),
('f8882cbd-fc37-4521-bfd2-992dc8eb9a9f', 2026, 'Poznanovich Family', 1, '2025-10-15', '2025-10-28', true),
('f8882cbd-fc37-4521-bfd2-992dc8eb9a9f', 2026, 'Woolf Family', 2, '2025-10-29', '2025-11-11', true),
('f8882cbd-fc37-4521-bfd2-992dc8eb9a9f', 2026, 'Cook Family', 3, '2025-11-12', '2025-11-25', true),
('f8882cbd-fc37-4521-bfd2-992dc8eb9a9f', 2026, 'Andrew Family', 4, '2025-11-26', '2025-12-09', false),
('f8882cbd-fc37-4521-bfd2-992dc8eb9a9f', 2026, 'Grandy Family', 5, '2025-12-10', '2025-12-23', false);