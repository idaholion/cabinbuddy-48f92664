-- Fix current_primary_turn_family to show correct active family
UPDATE rotation_orders 
SET current_primary_turn_family = 'Andrew Family'
WHERE organization_id = 'f8882cbd-fc37-4521-bfd2-992dc8eb9a9f';