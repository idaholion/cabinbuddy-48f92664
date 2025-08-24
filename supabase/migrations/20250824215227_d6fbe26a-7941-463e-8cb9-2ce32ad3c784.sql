-- Create a function to get user emails for organization members (for admins)
CREATE OR REPLACE FUNCTION public.get_organization_user_emails(org_id uuid)
RETURNS TABLE(user_id uuid, email text, first_name text, last_name text, display_name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Only allow organization admins or supervisors to get user emails
  IF NOT (is_supervisor() OR (is_organization_admin() AND validate_organization_access(org_id, 'get_user_emails'))) THEN
    RAISE EXCEPTION 'Access denied: Only organization admins or supervisors can view user emails';
  END IF;
  
  RETURN QUERY
  SELECT 
    au.id as user_id,
    au.email,
    p.first_name,
    p.last_name,
    p.display_name
  FROM auth.users au
  JOIN user_organizations uo ON au.id = uo.user_id
  LEFT JOIN profiles p ON au.id = p.user_id
  WHERE uo.organization_id = org_id;
END;
$function$;