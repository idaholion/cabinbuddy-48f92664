-- Reset 2026 to Andrew Family as well
UPDATE reservation_periods 
SET current_group_index = 0,
    current_family_group = 'Andrew Family',
    selection_start_date = CURRENT_DATE,
    selection_end_date = CURRENT_DATE + INTERVAL '7 days',
    reservations_completed = false,
    updated_at = NOW()
WHERE organization_id = 'f8882cbd-fc37-4521-bfd2-992dc8eb9a9f' 
AND rotation_year = 2026
AND current_group_index = 0;

-- Reset time period usage for 2026
UPDATE time_period_usage 
SET time_periods_used = 0, 
    selection_round = 'primary',
    updated_at = NOW()
WHERE organization_id = 'f8882cbd-fc37-4521-bfd2-992dc8eb9a9f' 
AND rotation_year = 2026;