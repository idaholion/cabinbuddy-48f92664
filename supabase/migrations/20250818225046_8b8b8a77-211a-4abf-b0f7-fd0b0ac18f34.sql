-- Create more restrictive RLS policies for organizations table to protect sensitive contact information

-- Drop existing policies that may be too permissive
DROP POLICY IF EXISTS "Authenticated users can view their organization" ON public.organizations;
DROP POLICY IF EXISTS "Authenticated users can update their organization" ON public.organizations;

-- Create restricted view policy for regular users - only basic org info, no contact details
CREATE POLICY "Users can view basic organization info"
ON public.organizations FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND id = get_user_organization_id()
);

-- Create admin-only policy for viewing sensitive contact information
CREATE POLICY "Organization admins can view full organization details"
ON public.organizations FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND (
    is_supervisor() 
    OR is_organization_admin()
    OR id IN (
      SELECT organization_id 
      FROM user_organizations 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  )
);

-- Create admin-only policy for updating organization information
CREATE POLICY "Organization admins can update organization details"
ON public.organizations FOR UPDATE
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND (
    is_supervisor() 
    OR is_organization_admin()
    OR id IN (
      SELECT organization_id 
      FROM user_organizations 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  )
);

-- Create function to get safe organization info for regular users
CREATE OR REPLACE FUNCTION get_safe_organization_info(org_id UUID)
RETURNS TABLE(
  id UUID,
  name TEXT,
  code TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only return basic info, no contact details
  RETURN QUERY
  SELECT 
    o.id,
    o.name,
    o.code,
    o.created_at,
    o.updated_at
  FROM organizations o
  WHERE o.id = org_id
  AND validate_organization_access(org_id, 'safe_organization_info');
END;
$$;