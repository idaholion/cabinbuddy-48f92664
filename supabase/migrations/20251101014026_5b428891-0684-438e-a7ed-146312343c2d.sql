-- Fix secondary_selection_status to set Cook as current family
-- Rotation order (reversed for secondary): Andrew, Cook, Woolf, Poznanovich, Comeau, Grandy
-- Andrew completed (1 period), so Cook should be current

UPDATE secondary_selection_status 
SET 
  current_family_group = 'Cook Family',
  current_group_index = 1,
  turn_completed = false,
  updated_at = now()
WHERE organization_id = 'f8882cbd-fc37-4521-bfd2-992dc8eb9a9f' 
AND rotation_year = 2026;