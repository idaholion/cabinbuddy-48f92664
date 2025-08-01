-- Fix function search path security warnings by adding SET search_path = 'public'
-- This addresses the mutable search_path security warnings

-- Update get_user_organization_id function
CREATE OR REPLACE FUNCTION public.get_user_organization_id()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = 'public'
AS $function$
  SELECT organization_id FROM public.user_organizations 
  WHERE user_id = auth.uid() AND is_primary = true
  LIMIT 1;
$function$;

-- Update is_supervisor function  
CREATE OR REPLACE FUNCTION public.is_supervisor()
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path = 'public'
AS $function$
DECLARE
  user_email TEXT;
BEGIN
  -- Get the current user's email from auth.users
  SELECT email INTO user_email FROM auth.users WHERE id = auth.uid();
  
  -- Check if user email exists in supervisors table and is active
  RETURN EXISTS (
    SELECT 1 FROM public.supervisors 
    WHERE email = user_email AND is_active = true
  );
END;
$function$;

-- Update get_user_organizations function
CREATE OR REPLACE FUNCTION public.get_user_organizations(user_uuid uuid DEFAULT auth.uid())
 RETURNS TABLE(organization_id uuid, organization_name text, organization_code text, role text, is_primary boolean, joined_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = 'public'
AS $function$
  SELECT 
    uo.organization_id,
    o.name as organization_name,
    o.code as organization_code,
    uo.role,
    uo.is_primary,
    uo.joined_at
  FROM public.user_organizations uo
  JOIN public.organizations o ON uo.organization_id = o.id
  WHERE uo.user_id = user_uuid
  ORDER BY uo.is_primary DESC, uo.joined_at ASC;
$function$;

-- Update get_user_primary_organization_id function
CREATE OR REPLACE FUNCTION public.get_user_primary_organization_id(user_uuid uuid DEFAULT auth.uid())
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = 'public'
AS $function$
  SELECT organization_id FROM public.user_organizations 
  WHERE user_id = user_uuid AND is_primary = true
  LIMIT 1;
$function$;

-- Update validate_organization_access function
CREATE OR REPLACE FUNCTION public.validate_organization_access(target_org_id uuid, operation_name text DEFAULT 'unknown'::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
DECLARE
  user_org_id UUID;
  user_has_access BOOLEAN := false;
BEGIN
  -- Get user's primary organization
  SELECT get_user_organization_id() INTO user_org_id;
  
  -- Check if user has access to target organization
  SELECT EXISTS(
    SELECT 1 FROM public.user_organizations 
    WHERE user_id = auth.uid() AND organization_id = target_org_id
  ) INTO user_has_access;
  
  -- Log the access attempt
  INSERT INTO public.organization_access_audit (
    user_id, 
    attempted_organization_id, 
    user_organization_id,
    access_type,
    table_name,
    operation_type,
    success
  ) VALUES (
    auth.uid(),
    target_org_id,
    user_org_id,
    'validation',
    operation_name,
    'CHECK',
    user_has_access
  );
  
  -- Return access result
  RETURN user_has_access;
END;
$function$;

-- Update get_available_colors function
CREATE OR REPLACE FUNCTION public.get_available_colors(p_organization_id uuid, p_current_group_id uuid DEFAULT NULL::uuid)
 RETURNS text[]
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path = 'public'
AS $function$
DECLARE
  default_colors TEXT[] := ARRAY[
    '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', 
    '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#6366f1', '#84cc16', 
    '#f43f5e', '#14b8a6', '#a855f7', '#64748b'
  ];
  used_colors TEXT[];
  available_colors TEXT[];
BEGIN
  -- Validate organization access
  IF NOT is_supervisor() AND NOT validate_organization_access(p_organization_id, 'get_available_colors') THEN
    RAISE EXCEPTION 'Access denied: Cannot access colors for organization %', p_organization_id;
  END IF;
  
  -- Get colors currently used by other groups in the organization
  SELECT ARRAY_AGG(color) INTO used_colors
  FROM family_groups 
  WHERE organization_id = p_organization_id 
    AND color IS NOT NULL
    AND (p_current_group_id IS NULL OR id != p_current_group_id);
    
  -- Return colors that are not used
  SELECT ARRAY_AGG(color) INTO available_colors
  FROM unnest(default_colors) AS color
  WHERE color != ALL(COALESCE(used_colors, ARRAY[]::TEXT[]));
  
  RETURN COALESCE(available_colors, ARRAY[]::TEXT[]);
END;
$function$;