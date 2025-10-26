-- Clear existing incorrect 2026 reservation periods
DELETE FROM reservation_periods 
WHERE organization_id = 'f8882cbd-fc37-4521-bfd2-992dc8eb9a9f' 
AND rotation_year = 2026;

-- Insert correct 2026 reservation periods with proper dates
-- Working backwards from Andrew Family (current) starting Oct 20, 2025
INSERT INTO reservation_periods (
  organization_id,
  rotation_year,
  current_family_group,
  current_group_index,
  selection_start_date,
  selection_end_date,
  reservations_completed
) VALUES
-- Completed periods (past families)
('f8882cbd-fc37-4521-bfd2-992dc8eb9a9f', 2026, 'Comeau Family', 0, '2025-08-25', '2025-09-07', true),
('f8882cbd-fc37-4521-bfd2-992dc8eb9a9f', 2026, 'Poznanovich Family', 1, '2025-09-08', '2025-09-21', true),
('f8882cbd-fc37-4521-bfd2-992dc8eb9a9f', 2026, 'Woolf Family', 2, '2025-09-22', '2025-10-05', true),
('f8882cbd-fc37-4521-bfd2-992dc8eb9a9f', 2026, 'Cook Family', 3, '2025-10-06', '2025-10-19', true),
-- Current and upcoming periods
('f8882cbd-fc37-4521-bfd2-992dc8eb9a9f', 2026, 'Andrew Family', 4, '2025-10-20', '2025-11-02', false),
('f8882cbd-fc37-4521-bfd2-992dc8eb9a9f', 2026, 'Grandy Family', 5, '2025-11-03', '2025-11-16', false);