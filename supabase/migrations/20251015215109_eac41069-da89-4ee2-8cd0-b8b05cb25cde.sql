-- Create a secure function to get family groups with proper contact info access control
-- Only admins and family group leads can see contact information
CREATE OR REPLACE FUNCTION public.get_safe_family_groups(p_organization_id uuid)
RETURNS TABLE(
  id uuid,
  organization_id uuid,
  name text,
  color text,
  host_members jsonb,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  -- Contact info only returned if user is admin or lead
  lead_name text,
  lead_email text,
  lead_phone text,
  alternate_lead_id text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_is_admin boolean;
  user_email text;
BEGIN
  -- Get current user's email
  SELECT email INTO user_email FROM auth.users WHERE id = auth.uid();
  
  -- Check if user is admin or supervisor
  user_is_admin := is_organization_admin() OR is_supervisor();
  
  RETURN QUERY
  SELECT 
    fg.id,
    fg.organization_id,
    fg.name,
    fg.color,
    fg.host_members,
    fg.created_at,
    fg.updated_at,
    -- Only return contact info if user is admin/supervisor or the family group lead
    CASE 
      WHEN user_is_admin OR fg.lead_email = user_email OR fg.alternate_lead_id = user_email 
      THEN fg.lead_name 
      ELSE NULL 
    END as lead_name,
    CASE 
      WHEN user_is_admin OR fg.lead_email = user_email OR fg.alternate_lead_id = user_email 
      THEN fg.lead_email 
      ELSE NULL 
    END as lead_email,
    CASE 
      WHEN user_is_admin OR fg.lead_email = user_email OR fg.alternate_lead_id = user_email 
      THEN fg.lead_phone 
      ELSE NULL 
    END as lead_phone,
    CASE 
      WHEN user_is_admin OR fg.lead_email = user_email OR fg.alternate_lead_id = user_email 
      THEN fg.alternate_lead_id 
      ELSE NULL 
    END as alternate_lead_id
  FROM family_groups fg
  WHERE fg.organization_id = p_organization_id
    AND validate_organization_access(p_organization_id, 'get_safe_family_groups');
END;
$$;