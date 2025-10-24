
-- Delete the incorrectly stored 2026 rotation order
-- The system will automatically calculate 2026 from the 2025 base using first_last_option
DELETE FROM rotation_orders 
WHERE rotation_year = 2026 
AND organization_id = 'f8882cbd-fc37-4521-bfd2-992dc8eb9a9f';
