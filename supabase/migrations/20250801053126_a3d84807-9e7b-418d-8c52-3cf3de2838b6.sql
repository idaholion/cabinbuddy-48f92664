-- Bulk operation functions for family group management

-- Function to bulk update lead contact information
CREATE OR REPLACE FUNCTION public.supervisor_bulk_update_leads(
  p_organization_id uuid,
  p_confirmation_code text,
  p_lead_phone text DEFAULT NULL,
  p_lead_email text DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
$function$

-- Function to bulk add host member to multiple groups
CREATE OR REPLACE FUNCTION public.supervisor_bulk_add_host_member(
  p_organization_id uuid,
  p_confirmation_code text,
  p_group_ids uuid[],
  p_host_name text,
  p_host_phone text DEFAULT NULL,
  p_host_email text DEFAULT NULL,
  p_can_make_reservations boolean DEFAULT false
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  affected_count INTEGER := 0;
  group_id uuid;
  current_hosts jsonb;
  new_host jsonb;
BEGIN
  -- Verify supervisor permission
  IF NOT is_supervisor() THEN
    RAISE EXCEPTION 'This function requires supervisor privileges';
  END IF;
  
  -- Verify confirmation code
  IF p_confirmation_code != 'CONFIRM_BULK_UPDATE' THEN
    RAISE EXCEPTION 'Invalid confirmation code. Use CONFIRM_BULK_UPDATE to proceed.';
  END IF;
  
  -- Create new host member object
  new_host := jsonb_build_object(
    'name', p_host_name,
    'phone', p_host_phone,
    'email', p_host_email,
    'canMakeReservations', p_can_make_reservations
  );
  
  -- Add host member to each specified group
  FOREACH group_id IN ARRAY p_group_ids
  LOOP
    -- Get current host members
    SELECT COALESCE(host_members, '[]'::jsonb) INTO current_hosts
    FROM family_groups 
    WHERE id = group_id AND organization_id = p_organization_id;
    
    -- Add new host member if group exists
    IF current_hosts IS NOT NULL THEN
      UPDATE family_groups 
      SET 
        host_members = current_hosts || new_host,
        updated_at = now()
      WHERE id = group_id AND organization_id = p_organization_id;
      
      affected_count := affected_count + 1;
    END IF;
  END LOOP;
  
  RETURN affected_count;
END;
$function$

-- Function to bulk remove host member by name
CREATE OR REPLACE FUNCTION public.supervisor_bulk_remove_host_member(
  p_organization_id uuid,
  p_confirmation_code text,
  p_host_name text
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
  
  -- Remove host member from all groups in organization
  UPDATE family_groups 
  SET 
    host_members = (
      SELECT jsonb_agg(member)
      FROM jsonb_array_elements(COALESCE(host_members, '[]'::jsonb)) AS member
      WHERE member->>'name' != p_host_name
    ),
    updated_at = now()
  WHERE organization_id = p_organization_id 
    AND host_members::text LIKE '%' || p_host_name || '%';
  
  GET DIAGNOSTICS affected_count = ROW_COUNT;
  
  RETURN affected_count;
END;
$function$

-- Function to bulk update reservation permissions
CREATE OR REPLACE FUNCTION public.supervisor_bulk_update_reservations(
  p_organization_id uuid,
  p_confirmation_code text,
  p_enable_all_hosts boolean DEFAULT NULL,
  p_disable_all_hosts boolean DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
  
  -- Update reservation permissions for all host members
  IF p_enable_all_hosts = true THEN
    UPDATE family_groups 
    SET 
      host_members = (
        SELECT jsonb_agg(
          jsonb_set(member, '{canMakeReservations}', 'true'::jsonb)
        )
        FROM jsonb_array_elements(COALESCE(host_members, '[]'::jsonb)) AS member
      ),
      updated_at = now()
    WHERE organization_id = p_organization_id AND host_members IS NOT NULL;
  ELSIF p_disable_all_hosts = true THEN
    UPDATE family_groups 
    SET 
      host_members = (
        SELECT jsonb_agg(
          jsonb_set(member, '{canMakeReservations}', 'false'::jsonb)
        )
        FROM jsonb_array_elements(COALESCE(host_members, '[]'::jsonb)) AS member
      ),
      updated_at = now()
    WHERE organization_id = p_organization_id AND host_members IS NOT NULL;
  END IF;
  
  GET DIAGNOSTICS affected_count = ROW_COUNT;
  
  RETURN affected_count;
END;
$function$