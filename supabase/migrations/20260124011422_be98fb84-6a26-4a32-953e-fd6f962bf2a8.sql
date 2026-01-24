-- Fix: Allow organization admins to perform bulk family group operations during setup
-- The issue is that when creating a new org, the admin needs to create multiple family groups
-- but the trigger blocks non-supervisors from bulk operations

CREATE OR REPLACE FUNCTION check_bulk_family_group_update()
RETURNS TRIGGER AS $$
DECLARE
  update_count INTEGER;
  is_bulk_operation BOOLEAN := FALSE;
  user_email TEXT;
  is_org_admin BOOLEAN := FALSE;
BEGIN
  -- Get current count of family groups being updated in this transaction
  -- Check if more than 2 family groups are being updated at once
  SELECT COUNT(*) INTO update_count
  FROM family_groups 
  WHERE organization_id = NEW.organization_id 
  AND updated_at > (NOW() - INTERVAL '1 second');
  
  -- If updating more than 2 groups within 1 second, consider it bulk
  IF update_count >= 2 THEN
    is_bulk_operation := TRUE;
  END IF;
  
  -- If it's a bulk operation, check if user is allowed
  IF is_bulk_operation THEN
    -- Supervisors are always allowed
    IF is_supervisor() THEN
      RETURN NEW;
    END IF;
    
    -- Check if user is the organization admin
    SELECT email INTO user_email FROM auth.users WHERE id = auth.uid();
    
    IF user_email IS NOT NULL THEN
      SELECT EXISTS (
        SELECT 1 FROM organizations 
        WHERE id = NEW.organization_id 
        AND admin_email = user_email
      ) INTO is_org_admin;
    END IF;
    
    -- Allow if org admin
    IF is_org_admin THEN
      RETURN NEW;
    END IF;
    
    -- Otherwise block
    RAISE EXCEPTION 'Bulk family group updates are restricted to supervisors only. Contact your administrator.';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment explaining the logic
COMMENT ON FUNCTION check_bulk_family_group_update() IS 
'Prevents bulk updates to family groups except for supervisors and organization admins. 
This allows org admins to set up their organization while still protecting against accidental bulk operations.';