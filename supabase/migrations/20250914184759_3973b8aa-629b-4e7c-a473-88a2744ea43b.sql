-- Step 1: Clean up duplicate is_primary entries
-- First, let's create a supervisor function to fix the database integrity issues

CREATE OR REPLACE FUNCTION public.supervisor_fix_primary_organization_duplicates()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  fixed_count INTEGER := 0;
  org_record RECORD;
  user_record RECORD;
BEGIN
  -- Verify supervisor permission
  IF NOT is_supervisor() THEN
    RAISE EXCEPTION 'This function requires supervisor privileges';
  END IF;

  -- For each organization that has multiple is_primary = true entries
  FOR org_record IN 
    SELECT organization_id 
    FROM user_organizations 
    WHERE is_primary = true 
    GROUP BY organization_id 
    HAVING COUNT(*) > 1
  LOOP
    -- For this organization, keep only the admin user as primary (or first user if no admin)
    FOR user_record IN
      SELECT user_id, role, joined_at
      FROM user_organizations 
      WHERE organization_id = org_record.organization_id AND is_primary = true
      ORDER BY 
        CASE 
          WHEN role = 'admin' THEN 1 
          WHEN role = 'treasurer' THEN 2 
          ELSE 3 
        END,
        joined_at ASC
    LOOP
      -- Keep the first one as primary, set others to false
      IF fixed_count = 0 THEN
        -- Keep this one as primary (first admin or first user)
        fixed_count := 1;
      ELSE
        -- Set others to false
        UPDATE user_organizations 
        SET is_primary = false 
        WHERE user_id = user_record.user_id 
          AND organization_id = org_record.organization_id;
      END IF;
    END LOOP;
    
    -- Reset counter for next organization
    fixed_count := 0;
  END LOOP;

  -- Now ensure each user has exactly one primary organization
  FOR user_record IN
    SELECT user_id 
    FROM user_organizations 
    GROUP BY user_id 
    HAVING COUNT(CASE WHEN is_primary = true THEN 1 END) = 0
  LOOP
    -- This user has no primary organization, set their first organization as primary
    UPDATE user_organizations 
    SET is_primary = true 
    WHERE user_id = user_record.user_id 
      AND organization_id = (
        SELECT organization_id 
        FROM user_organizations 
        WHERE user_id = user_record.user_id 
        ORDER BY joined_at ASC 
        LIMIT 1
      );
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Primary organization duplicates fixed successfully'
  );
END;
$function$;

-- Step 2: Create a debug function to check authentication context
CREATE OR REPLACE FUNCTION public.debug_auth_context()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  current_user_id UUID;
  primary_org_id UUID;
  user_email TEXT;
  org_count INTEGER;
BEGIN
  -- Get current authentication context
  SELECT auth.uid() INTO current_user_id;
  SELECT get_user_primary_organization_id() INTO primary_org_id;
  
  -- Get user email if authenticated
  IF current_user_id IS NOT NULL THEN
    SELECT email INTO user_email FROM auth.users WHERE id = current_user_id;
    
    SELECT COUNT(*) INTO org_count 
    FROM user_organizations 
    WHERE user_id = current_user_id;
  END IF;
  
  RETURN jsonb_build_object(
    'auth_uid', current_user_id,
    'user_email', COALESCE(user_email, 'null'),
    'primary_org_id', primary_org_id,
    'user_org_count', COALESCE(org_count, 0),
    'timestamp', now()
  );
END;
$function$;