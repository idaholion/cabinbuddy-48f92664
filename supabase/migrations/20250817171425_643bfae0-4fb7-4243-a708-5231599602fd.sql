-- Add unique constraint to prevent duplicate family group names within an organization
ALTER TABLE family_groups 
ADD CONSTRAINT family_groups_organization_name_unique 
UNIQUE (organization_id, name);