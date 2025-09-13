-- Update RLS policies for reservations to allow organization admins to view all reservations in their organization

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their organization's reservations" ON reservations;
DROP POLICY IF EXISTS "Organization admins can view all reservations in their organization" ON reservations;
DROP POLICY IF EXISTS "Users can view their family group reservations" ON reservations;

-- Create new policy for regular users to view reservations for their organization
-- (This maintains existing functionality)
CREATE POLICY "Users can view their organization's reservations" 
ON reservations FOR SELECT 
USING (organization_id = get_user_organization_id());

-- Create additional policy for organization admins to have broader access
CREATE POLICY "Organization admins can view all reservations in their organization"
ON reservations FOR SELECT
USING (
  organization_id = get_user_organization_id() 
  AND is_organization_admin()
);