-- Fix the get_organization_user_emails function type mismatch
-- Drop the existing function if it exists
DROP FUNCTION IF EXISTS public.get_organization_user_emails(uuid);

-- Recreate the function with correct return types
CREATE OR REPLACE FUNCTION public.get_organization_user_emails(org_id uuid)
RETURNS TABLE (
  user_id uuid,
  email text,
  first_name text,
  last_name text
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    au.id as user_id,
    au.email::text,
    COALESCE(au.raw_user_meta_data->>'first_name', '')::text as first_name,
    COALESCE(au.raw_user_meta_data->>'last_name', '')::text as last_name
  FROM auth.users au
  INNER JOIN user_organizations uo ON au.id = uo.user_id
  WHERE uo.organization_id = org_id;
$$;