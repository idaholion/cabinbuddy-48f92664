-- Add color field to family_groups table
ALTER TABLE public.family_groups ADD COLUMN color TEXT;

-- Create a function to get available colors for an organization
CREATE OR REPLACE FUNCTION public.get_available_colors(p_organization_id uuid, p_current_group_id uuid DEFAULT NULL)
RETURNS TEXT[]
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  default_colors TEXT[] := ARRAY[
    '#ef4444', -- red-500
    '#f97316', -- orange-500  
    '#eab308', -- yellow-500
    '#22c55e', -- green-500
    '#06b6d4', -- cyan-500
    '#3b82f6', -- blue-500
    '#8b5cf6', -- violet-500
    '#ec4899', -- pink-500
    '#f59e0b', -- amber-500
    '#10b981', -- emerald-500
    '#6366f1', -- indigo-500
    '#84cc16', -- lime-500
    '#f43f5e', -- rose-500
    '#14b8a6', -- teal-500
    '#a855f7', -- purple-500
    '#64748b'  -- slate-500
  ];
  used_colors TEXT[];
  available_colors TEXT[];
BEGIN
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
$$;

-- Create a function to assign default colors to family groups without colors
CREATE OR REPLACE FUNCTION public.assign_default_colors()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  group_record RECORD;
  available_colors TEXT[];
  color_index INTEGER := 1;
BEGIN
  -- Loop through family groups without colors
  FOR group_record IN 
    SELECT id, organization_id 
    FROM family_groups 
    WHERE color IS NULL
    ORDER BY organization_id, created_at
  LOOP
    -- Get available colors for this organization
    SELECT get_available_colors(group_record.organization_id) INTO available_colors;
    
    -- Assign the first available color
    IF array_length(available_colors, 1) > 0 THEN
      UPDATE family_groups 
      SET color = available_colors[1]
      WHERE id = group_record.id;
    END IF;
  END LOOP;
END;
$$;

-- Assign default colors to existing family groups
SELECT assign_default_colors();