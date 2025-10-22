-- Disable validation triggers temporarily
ALTER TABLE reservations DISABLE TRIGGER validate_reservations_access;

-- Fix Barb's reservations - remove incorrect P3 marking
UPDATE reservations 
SET 
  time_period_number = NULL,
  updated_at = now()
WHERE id IN (
  '88c8d699-3d39-4170-ab4e-cce711c8c44a',
  'bee92095-db25-448d-bd6c-875c618a5994'
);

-- Add Barb as host to June reservation
UPDATE reservations
SET 
  host_assignments = '[{"host_name": "Barb Woolf", "host_email": "54bjwoolf@gmail.com", "start_date": "2026-06-19", "end_date": "2026-06-26"}]'::jsonb,
  updated_at = now()
WHERE id = '88c8d699-3d39-4170-ab4e-cce711c8c44a'
  AND (host_assignments IS NULL OR host_assignments = '[]'::jsonb);

-- Re-enable validation trigger
ALTER TABLE reservations ENABLE TRIGGER validate_reservations_access;

-- Update Woolf Family time period usage to 2/2
UPDATE time_period_usage
SET 
  time_periods_used = 2,
  updated_at = now()
WHERE organization_id = 'f8882cbd-fc37-4521-bfd2-992dc8eb9a9f'
  AND rotation_year = 2026
  AND family_group = 'Woolf Family';