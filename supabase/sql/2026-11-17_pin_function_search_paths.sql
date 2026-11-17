-- Pin search_path on two SECURITY DEFINER trigger functions.
-- Purpose: prevent search_path hijacking (security scan warnings) without
-- changing any logic. Both functions already reference only public-schema
-- tables plus schema-qualified auth.users / auth.uid(), and is_supervisor()
-- lives in public, so behavior is unchanged.
--
-- Run this whole file in the Supabase SQL Editor.

CREATE OR REPLACE FUNCTION public.check_bulk_family_group_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.log_allocation_model_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  -- Only log if allocation_model actually changed
  IF (OLD.allocation_model IS DISTINCT FROM NEW.allocation_model) THEN
    INSERT INTO allocation_model_audit (
      organization_id,
      old_model,
      new_model,
      changed_by_user_id,
      change_reason
    ) VALUES (
      NEW.id,
      OLD.allocation_model,
      NEW.allocation_model,
      auth.uid(),
      'Allocation model changed via application'
    );
    
    -- If production org, also log to emergency access log for extra visibility
    IF NEW.is_test_organization = false THEN
      INSERT INTO emergency_access_log (
        organization_id,
        user_id,
        action_type,
        reason,
        details
      ) VALUES (
        NEW.id,
        auth.uid(),
        'ALLOCATION_MODEL_CHANGE',
        'Production organization allocation model modified',
        jsonb_build_object(
          'old_model', OLD.allocation_model,
          'new_model', NEW.allocation_model,
          'organization_name', NEW.name
        )
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Confirm both functions now carry the pinned search_path.
SELECT p.proname, p.proconfig
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN ('check_bulk_family_group_update', 'log_allocation_model_change')
ORDER BY p.proname;
