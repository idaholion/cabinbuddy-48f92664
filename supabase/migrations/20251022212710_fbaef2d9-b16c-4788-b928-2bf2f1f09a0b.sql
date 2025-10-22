-- Reset Andrew Family to 0 periods used for testing
UPDATE time_period_usage
SET time_periods_used = 0,
    last_selection_date = NULL
WHERE family_group = 'Andrew Family' AND rotation_year = 2025;

-- Reset secondary selection status to Andrew Family
UPDATE secondary_selection_status
SET current_family_group = 'Andrew Family',
    current_group_index = 0,
    updated_at = now()
WHERE rotation_year = 2025;