-- Create function to remove duplicate family groups (supervisor only)
CREATE OR REPLACE FUNCTION public.supervisor_cleanup_duplicate_family_groups()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  deleted_count INTEGER := 0;
BEGIN
  -- Verify supervisor permission
  IF NOT is_supervisor() THEN
    RAISE EXCEPTION 'This function requires supervisor privileges';
  END IF;
  
  -- Delete duplicate family groups, keeping the best one per organization/name
  WITH ranked_groups AS (
    SELECT 
      id,
      name,
      organization_id,
      lead_name,
      host_members,
      created_at,
      updated_at,
      ROW_NUMBER() OVER (
        PARTITION BY organization_id, name 
        ORDER BY 
          CASE 
            WHEN lead_name IS NOT NULL THEN 1 
            WHEN host_members IS NOT NULL AND jsonb_array_length(host_members) > 0 THEN 2
            ELSE 3 
          END,
          updated_at DESC,
          created_at DESC
      ) as rn
    FROM family_groups
  ),
  groups_to_delete AS (
    SELECT id FROM ranked_groups WHERE rn > 1
  )
  DELETE FROM family_groups 
  WHERE id IN (SELECT id FROM groups_to_delete);
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Add unique constraint to prevent future duplicates
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'family_groups' 
    AND constraint_name = 'family_groups_organization_name_unique'
  ) THEN
    ALTER TABLE family_groups 
    ADD CONSTRAINT family_groups_organization_name_unique 
    UNIQUE (organization_id, name);
  END IF;
  
  RETURN format('Cleaned up %s duplicate family groups and added unique constraint', deleted_count);
END;
$$;