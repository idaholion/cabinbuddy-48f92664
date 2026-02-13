-- Update check constraint to include 'checkout' and keep 'closing' for end-of-season
ALTER TABLE custom_checklists DROP CONSTRAINT custom_checklists_checklist_type_check;
ALTER TABLE custom_checklists ADD CONSTRAINT custom_checklists_checklist_type_check 
  CHECK (checklist_type = ANY (ARRAY['arrival'::text, 'daily'::text, 'closing'::text, 'opening'::text, 'seasonal'::text, 'maintenance'::text, 'checkout'::text]));

-- Rename existing 'closing' records to 'checkout' (all were created by the Checkout page)
UPDATE custom_checklists SET checklist_type = 'checkout' WHERE checklist_type = 'closing';