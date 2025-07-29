-- Create some demo reservations to show family group colors
-- First, let's see what organization and family groups we have
INSERT INTO reservations (organization_id, family_group, start_date, end_date, guest_count, status, property_name)
SELECT 
  fg.organization_id,
  fg.name,
  CURRENT_DATE + (RANDOM() * 30)::int,
  CURRENT_DATE + (RANDOM() * 30)::int + (RANDOM() * 7)::int + 1,
  (RANDOM() * 6 + 2)::int,
  'confirmed',
  'Demo Property'
FROM family_groups fg
WHERE fg.color IS NOT NULL
LIMIT 5;

-- Add a few more reservations for different date ranges
INSERT INTO reservations (organization_id, family_group, start_date, end_date, guest_count, status, property_name)
SELECT 
  fg.organization_id,
  fg.name,
  CURRENT_DATE + 10 + (ROW_NUMBER() OVER())::int,
  CURRENT_DATE + 10 + (ROW_NUMBER() OVER())::int + 3,
  4,
  'confirmed',
  'Demo Property'
FROM family_groups fg
WHERE fg.color IS NOT NULL
LIMIT 3;