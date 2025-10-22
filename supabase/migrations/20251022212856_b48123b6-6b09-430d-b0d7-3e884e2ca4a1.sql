-- Force reset Andrew Family to exactly 0 periods for testing
UPDATE time_period_usage
SET time_periods_used = 0,
    last_selection_date = NULL
WHERE family_group = 'Andrew Family' 
  AND rotation_year = 2025
  AND organization_id = 'f8882cbd-fc37-4521-bfd2-992dc8eb9a9f';