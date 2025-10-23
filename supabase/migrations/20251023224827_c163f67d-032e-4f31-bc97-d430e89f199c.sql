-- Fix time_period_usage for 2026 rotation
-- This migration:
-- 1. Adds missing Grandy Family entry
-- 2. Marks completed turns (Comeau, Poznanovich, Woolf, Cook) as true
-- 3. Ensures Andrew and Grandy have turn_completed = false

-- Step 1: Add Grandy Family to time_period_usage
INSERT INTO time_period_usage (
  organization_id,
  family_group,
  rotation_year,
  time_periods_used,
  time_periods_allowed,
  turn_completed
)
VALUES (
  'f8882cbd-fc37-4521-bfd2-992dc8eb9a9f',
  'Grandy Family',
  2026,
  0,
  2,
  false
)
ON CONFLICT (organization_id, family_group, rotation_year) DO NOTHING;

-- Step 2: Mark completed turns as true for families that have finished
UPDATE time_period_usage
SET turn_completed = true
WHERE organization_id = 'f8882cbd-fc37-4521-bfd2-992dc8eb9a9f'
  AND rotation_year = 2026
  AND family_group IN ('Comeau Family', 'Poznanovich Family', 'Woolf Family', 'Cook Family');

-- Step 3: Ensure Andrew and Grandy are marked as not completed (for testing)
UPDATE time_period_usage
SET turn_completed = false
WHERE organization_id = 'f8882cbd-fc37-4521-bfd2-992dc8eb9a9f'
  AND rotation_year = 2026
  AND family_group IN ('Andrew Family', 'Grandy Family');