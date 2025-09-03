-- Add unique constraint for custom_checklists
ALTER TABLE custom_checklists 
ADD CONSTRAINT custom_checklists_org_type_unique 
UNIQUE (organization_id, checklist_type);