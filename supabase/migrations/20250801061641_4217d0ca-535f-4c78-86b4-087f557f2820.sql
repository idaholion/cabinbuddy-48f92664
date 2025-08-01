-- Fix the remaining functions with search_path issues
CREATE OR REPLACE FUNCTION public.supervisor_bulk_remove_host_member(p_organization_id uuid, p_confirmation_code text, p_host_name text)
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
$function$;

CREATE OR REPLACE FUNCTION public.supervisor_bulk_update_reservations(p_organization_id uuid, p_confirmation_code text, p_enable_all_hosts boolean DEFAULT NULL::boolean, p_disable_all_hosts boolean DEFAULT NULL::boolean)
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
$function$;

CREATE OR REPLACE FUNCTION public.assign_default_colors()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
DECLARE
  group_record RECORD;
  available_colors TEXT[];
  color_index INTEGER := 1;
BEGIN
  -- Restrict to supervisors only
  IF NOT is_supervisor() THEN
    RAISE EXCEPTION 'assign_default_colors function can only be executed by supervisors';
  END IF;
  
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
$function$;

CREATE OR REPLACE FUNCTION public.rename_family_group(p_organization_id uuid, p_old_name text, p_new_name text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
DECLARE
  group_exists BOOLEAN;
  name_conflict BOOLEAN;
BEGIN
  -- Check if the family group exists in the organization
  SELECT EXISTS(
    SELECT 1 FROM family_groups 
    WHERE organization_id = p_organization_id AND name = p_old_name
  ) INTO group_exists;
  
  IF NOT group_exists THEN
    RAISE EXCEPTION 'Family group "%" does not exist in this organization', p_old_name;
  END IF;
  
  -- Check if new name already exists in the organization
  SELECT EXISTS(
    SELECT 1 FROM family_groups 
    WHERE organization_id = p_organization_id AND name = p_new_name AND name != p_old_name
  ) INTO name_conflict;
  
  IF name_conflict THEN
    RAISE EXCEPTION 'Family group name "%" already exists in this organization', p_new_name;
  END IF;
  
  -- Update family_groups table
  UPDATE family_groups 
  SET name = p_new_name, updated_at = now()
  WHERE organization_id = p_organization_id AND name = p_old_name;
  
  -- Update reservations table
  UPDATE reservations 
  SET family_group = p_new_name, updated_at = now()
  WHERE organization_id = p_organization_id AND family_group = p_old_name;
  
  -- Update receipts table
  UPDATE receipts 
  SET family_group = p_new_name, updated_at = now()
  WHERE organization_id = p_organization_id AND family_group = p_old_name;
  
  -- Update time_period_usage table
  UPDATE time_period_usage 
  SET family_group = p_new_name, updated_at = now()
  WHERE organization_id = p_organization_id AND family_group = p_old_name;
  
  -- Update checkin_sessions table
  UPDATE checkin_sessions 
  SET family_group = p_new_name, updated_at = now()
  WHERE organization_id = p_organization_id AND family_group = p_old_name;
  
  -- Update survey_responses table
  UPDATE survey_responses 
  SET family_group = p_new_name, updated_at = now()
  WHERE organization_id = p_organization_id AND family_group = p_old_name;
  
  -- Update notification_log table
  UPDATE notification_log 
  SET family_group = p_new_name
  WHERE organization_id = p_organization_id AND family_group = p_old_name;
  
  -- Update trade_requests table (requester_family_group)
  UPDATE trade_requests 
  SET requester_family_group = p_new_name, updated_at = now()
  WHERE organization_id = p_organization_id AND requester_family_group = p_old_name;
  
  -- Update trade_requests table (target_family_group)
  UPDATE trade_requests 
  SET target_family_group = p_new_name, updated_at = now()
  WHERE organization_id = p_organization_id AND target_family_group = p_old_name;
  
  -- Update trade_notifications table
  UPDATE trade_notifications 
  SET recipient_family_group = p_new_name
  WHERE organization_id = p_organization_id AND recipient_family_group = p_old_name;
  
  -- Update alternate_lead_id references in family_groups (if they reference the old name)
  UPDATE family_groups 
  SET alternate_lead_id = p_new_name, updated_at = now()
  WHERE organization_id = p_organization_id AND alternate_lead_id = p_old_name;
  
  -- Update reservation_periods table (current_family_group)
  UPDATE reservation_periods 
  SET current_family_group = p_new_name, updated_at = now()
  WHERE organization_id = p_organization_id AND current_family_group = p_old_name;
  
  -- Update secondary_selection_status table (current_family_group)
  UPDATE secondary_selection_status 
  SET current_family_group = p_new_name, updated_at = now()
  WHERE organization_id = p_organization_id AND current_family_group = p_old_name;
  
  -- Update rotation_orders table (scan JSONB for the old name and replace)
  UPDATE rotation_orders 
  SET rotation_order = (
    SELECT jsonb_agg(
      CASE 
        WHEN value::text = ('"' || p_old_name || '"') THEN to_jsonb(p_new_name)
        ELSE value
      END
    )
    FROM jsonb_array_elements(rotation_order) AS value
  ),
  updated_at = now()
  WHERE organization_id = p_organization_id 
    AND rotation_order::text LIKE '%' || p_old_name || '%';
  
  RETURN TRUE;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to rename family group: %', SQLERRM;
END;
$function$;

CREATE OR REPLACE FUNCTION public.check_bulk_family_group_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
DECLARE
  update_count INTEGER;
  is_bulk_operation BOOLEAN := FALSE;
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
  
  -- Allow bulk operations only for supervisors
  IF is_bulk_operation AND NOT is_supervisor() THEN
    RAISE EXCEPTION 'Bulk family group updates are restricted to supervisors only. Contact your administrator.';
  END IF;
  
  RETURN NEW;
END;
$function$;