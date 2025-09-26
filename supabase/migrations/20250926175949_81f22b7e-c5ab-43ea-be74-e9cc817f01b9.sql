-- Fix search_path security issue for the user emails function
CREATE OR REPLACE FUNCTION public.get_organization_user_emails(org_id uuid)
 RETURNS TABLE(user_id uuid, email text, first_name text, last_name text, display_name text)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path = public
AS $function$
  SELECT 
    au.id as user_id,
    au.email::text,
    COALESCE(au.raw_user_meta_data->>'first_name', '')::text as first_name,
    COALESCE(au.raw_user_meta_data->>'last_name', '')::text as last_name,
    COALESCE(
      au.raw_user_meta_data->>'display_name',
      NULLIF(TRIM(CONCAT(
        COALESCE(au.raw_user_meta_data->>'first_name', ''), 
        ' ', 
        COALESCE(au.raw_user_meta_data->>'last_name', '')
      )), ''),
      SPLIT_PART(au.email::text, '@', 1)
    )::text as display_name
  FROM auth.users au
  INNER JOIN user_organizations uo ON au.id = uo.user_id
  WHERE uo.organization_id = org_id;
$function$