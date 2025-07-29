-- Create function to rename a family group across all tables
CREATE OR REPLACE FUNCTION public.rename_family_group(
  p_organization_id UUID,
  p_old_name TEXT,
  p_new_name TEXT
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;