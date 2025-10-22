-- Reset Andrew Family to 2 of 2 periods for testing
UPDATE time_period_usage 
SET time_periods_used = 2 
WHERE family_group = 'Andrew Family' AND rotation_year = 2025;