-- Update the get_available_colors function to use a limited palette of 10 colors for family groups
CREATE OR REPLACE FUNCTION public.get_available_colors(p_organization_id uuid, p_current_group_id uuid DEFAULT NULL::uuid)
 RETURNS text[]
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  -- Limited color palette for family groups (10 colors)
  default_colors TEXT[] := ARRAY[
    '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', 
    '#3b82f6', '#8b5cf6', '#ec4899', '#10b981', '#6366f1'
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