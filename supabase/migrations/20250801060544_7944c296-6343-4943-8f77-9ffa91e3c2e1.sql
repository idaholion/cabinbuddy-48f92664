-- Fix remaining functions with search_path security warnings
-- Update all remaining functions to include SET search_path = 'public'

-- Update set_primary_organization function
CREATE OR REPLACE FUNCTION public.set_primary_organization(org_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
BEGIN
  -- Verify user has access to this organization
  IF NOT EXISTS(
    SELECT 1 FROM public.user_organizations 
    WHERE user_id = auth.uid() AND organization_id = org_id
  ) THEN
    RAISE EXCEPTION 'Access denied: User is not a member of organization %', org_id;
  END IF;
  
  -- First, unset all primary flags for this user
  UPDATE public.user_organizations 
  SET is_primary = false 
  WHERE user_id = auth.uid();
  
  -- Then set the specified organization as primary
  UPDATE public.user_organizations 
  SET is_primary = true 
  WHERE user_id = auth.uid() AND organization_id = org_id;
  
  -- Return true if the update was successful
  RETURN EXISTS(
    SELECT 1 FROM public.user_organizations 
    WHERE user_id = auth.uid() AND organization_id = org_id AND is_primary = true
  );
END;
$function$;

-- Update validate_organization_data_access trigger function
CREATE OR REPLACE FUNCTION public.validate_organization_data_access()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
BEGIN
  -- Skip validation for supervisors
  IF is_supervisor() THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  
  -- For INSERT and UPDATE operations
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    -- Validate organization access
    IF NOT validate_organization_access(NEW.organization_id, TG_TABLE_NAME || '_' || TG_OP) THEN
      RAISE EXCEPTION 'Access denied: Cannot % data for organization %', TG_OP, NEW.organization_id;
    END IF;
    RETURN NEW;
  END IF;
  
  -- For DELETE operations
  IF TG_OP = 'DELETE' THEN
    -- Validate organization access
    IF NOT validate_organization_access(OLD.organization_id, TG_TABLE_NAME || '_' || TG_OP) THEN
      RAISE EXCEPTION 'Access denied: Cannot % data for organization %', TG_OP, OLD.organization_id;
    END IF;
    RETURN OLD;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Update handle_new_user trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, first_name, last_name, display_name)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'first_name')
  );
  RETURN NEW;
END;
$function$;

-- Update the bulk operation functions to include search_path
CREATE OR REPLACE FUNCTION public.supervisor_bulk_update_leads(p_organization_id uuid, p_confirmation_code text, p_lead_phone text DEFAULT NULL::text, p_lead_email text DEFAULT NULL::text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
DECLARE
  affected_count INTEGER := 0;
BEGIN
  -- Verify supervisor permission
  IF NOT is_supervisor() THEN
    RAISE EXCEPTION 'This function requires supervisor privileges';
  END IF;
  
  -- Verify confirmation code
  IF p_confirmation_code != 'CONFIRM_BULK_UPDATE' THEN
    RAISE EXCEPTION 'Invalid confirmation code. Use CONFIRM_BULK_UPDATE to proceed.';
  END IF;
  
  -- Update lead contact information for all groups in organization
  UPDATE family_groups 
  SET 
    lead_phone = COALESCE(p_lead_phone, lead_phone),
    lead_email = COALESCE(p_lead_email, lead_email),
    updated_at = now()
  WHERE organization_id = p_organization_id;
  
  GET DIAGNOSTICS affected_count = ROW_COUNT;
  
  RETURN affected_count;
END;
$function$;

CREATE OR REPLACE FUNCTION public.supervisor_bulk_update_family_groups(p_organization_id uuid, p_confirmation_code text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
BEGIN
  -- Verify supervisor permission
  IF NOT is_supervisor() THEN
    RAISE EXCEPTION 'This function requires supervisor privileges';
  END IF;
  
  -- Verify confirmation code
  IF p_confirmation_code != 'CONFIRM_BULK_UPDATE' THEN
    RAISE EXCEPTION 'Invalid confirmation code. Use CONFIRM_BULK_UPDATE to proceed.';
  END IF;
  
  -- This function can be extended to perform specific bulk operations
  -- For now, it's a safe wrapper for bulk operations
  
  RETURN TRUE;
END;
$function$;