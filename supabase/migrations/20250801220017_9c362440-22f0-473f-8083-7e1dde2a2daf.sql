-- Function to reset entire database to clean state (supervisors only)
CREATE OR REPLACE FUNCTION public.supervisor_reset_database(p_confirmation_code text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  tables_cleared text[] := ARRAY[]::text[];
  table_name text;
BEGIN
  -- Verify supervisor permission
  IF NOT is_supervisor() THEN
    RAISE EXCEPTION 'This function requires supervisor privileges';
  END IF;
  
  -- Verify confirmation code
  IF p_confirmation_code != 'RESET_ALL_DATA' THEN
    RAISE EXCEPTION 'Invalid confirmation code. Use RESET_ALL_DATA to proceed.';
  END IF;
  
  -- Clear all organizational data but preserve supervisors
  -- Note: Order matters due to foreign key dependencies
  
  -- Clear user-organization relationships
  DELETE FROM user_organizations;
  tables_cleared := array_append(tables_cleared, 'user_organizations');
  
  -- Clear all organization-specific data
  DELETE FROM calendar_keeper_requests;
  tables_cleared := array_append(tables_cleared, 'calendar_keeper_requests');
  
  DELETE FROM work_weekend_approvals;
  tables_cleared := array_append(tables_cleared, 'work_weekend_approvals');
  
  DELETE FROM work_weekends;
  tables_cleared := array_append(tables_cleared, 'work_weekends');
  
  DELETE FROM trade_notifications;
  tables_cleared := array_append(tables_cleared, 'trade_notifications');
  
  DELETE FROM trade_requests;
  tables_cleared := array_append(tables_cleared, 'trade_requests');
  
  DELETE FROM notification_log;
  tables_cleared := array_append(tables_cleared, 'notification_log');
  
  DELETE FROM time_period_usage;
  tables_cleared := array_append(tables_cleared, 'time_period_usage');
  
  DELETE FROM secondary_selection_status;
  tables_cleared := array_append(tables_cleared, 'secondary_selection_status');
  
  DELETE FROM reservations;
  tables_cleared := array_append(tables_cleared, 'reservations');
  
  DELETE FROM reservation_periods;
  tables_cleared := array_append(tables_cleared, 'reservation_periods');
  
  DELETE FROM rotation_orders;
  tables_cleared := array_append(tables_cleared, 'rotation_orders');
  
  DELETE FROM survey_responses;
  tables_cleared := array_append(tables_cleared, 'survey_responses');
  
  DELETE FROM checkin_sessions;
  tables_cleared := array_append(tables_cleared, 'checkin_sessions');
  
  DELETE FROM custom_checklists;
  tables_cleared := array_append(tables_cleared, 'custom_checklists');
  
  DELETE FROM receipts;
  tables_cleared := array_append(tables_cleared, 'receipts');
  
  DELETE FROM recurring_bills;
  tables_cleared := array_append(tables_cleared, 'recurring_bills');
  
  DELETE FROM reservation_settings;
  tables_cleared := array_append(tables_cleared, 'reservation_settings');
  
  DELETE FROM family_groups;
  tables_cleared := array_append(tables_cleared, 'family_groups');
  
  DELETE FROM organizations;
  tables_cleared := array_append(tables_cleared, 'organizations');
  
  -- Clear profiles (but auth.users remains for login)
  DELETE FROM profiles;
  tables_cleared := array_append(tables_cleared, 'profiles');
  
  -- Keep supervisors table intact
  
  -- Log the operation
  INSERT INTO bulk_operation_audit (
    operation_type,
    records_affected,
    performed_by_user_id,
    details
  ) VALUES (
    'FULL_DATABASE_RESET',
    1,
    auth.uid(),
    jsonb_build_object(
      'tables_cleared', tables_cleared,
      'confirmation_code', p_confirmation_code
    )
  );
  
  RETURN 'Database reset complete. Cleared tables: ' || array_to_string(tables_cleared, ', ');
END;
$function$;

-- Function to delete a specific organization and all its data
CREATE OR REPLACE FUNCTION public.supervisor_delete_organization(p_organization_id uuid, p_confirmation_code text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  org_name text;
  records_deleted integer := 0;
  total_records integer := 0;
BEGIN
  -- Verify supervisor permission
  IF NOT is_supervisor() THEN
    RAISE EXCEPTION 'This function requires supervisor privileges';
  END IF;
  
  -- Verify confirmation code format: DELETE_ORG_[organization_name]
  SELECT name INTO org_name FROM organizations WHERE id = p_organization_id;
  
  IF org_name IS NULL THEN
    RAISE EXCEPTION 'Organization not found';
  END IF;
  
  IF p_confirmation_code != ('DELETE_ORG_' || upper(replace(org_name, ' ', '_'))) THEN
    RAISE EXCEPTION 'Invalid confirmation code. Use DELETE_ORG_% to proceed.', upper(replace(org_name, ' ', '_'));
  END IF;
  
  -- Delete all organization data in correct order
  
  -- Calendar keeper requests
  DELETE FROM calendar_keeper_requests WHERE organization_id = p_organization_id;
  GET DIAGNOSTICS records_deleted = ROW_COUNT;
  total_records := total_records + records_deleted;
  
  -- Work weekend related
  DELETE FROM work_weekend_approvals WHERE organization_id = p_organization_id;
  GET DIAGNOSTICS records_deleted = ROW_COUNT;
  total_records := total_records + records_deleted;
  
  DELETE FROM work_weekends WHERE organization_id = p_organization_id;
  GET DIAGNOSTICS records_deleted = ROW_COUNT;
  total_records := total_records + records_deleted;
  
  -- Trade related
  DELETE FROM trade_notifications WHERE organization_id = p_organization_id;
  GET DIAGNOSTICS records_deleted = ROW_COUNT;
  total_records := total_records + records_deleted;
  
  DELETE FROM trade_requests WHERE organization_id = p_organization_id;
  GET DIAGNOSTICS records_deleted = ROW_COUNT;
  total_records := total_records + records_deleted;
  
  -- Notification log
  DELETE FROM notification_log WHERE organization_id = p_organization_id;
  GET DIAGNOSTICS records_deleted = ROW_COUNT;
  total_records := total_records + records_deleted;
  
  -- Time and reservation related
  DELETE FROM time_period_usage WHERE organization_id = p_organization_id;
  GET DIAGNOSTICS records_deleted = ROW_COUNT;
  total_records := total_records + records_deleted;
  
  DELETE FROM secondary_selection_status WHERE organization_id = p_organization_id;
  GET DIAGNOSTICS records_deleted = ROW_COUNT;
  total_records := total_records + records_deleted;
  
  DELETE FROM reservations WHERE organization_id = p_organization_id;
  GET DIAGNOSTICS records_deleted = ROW_COUNT;
  total_records := total_records + records_deleted;
  
  DELETE FROM reservation_periods WHERE organization_id = p_organization_id;
  GET DIAGNOSTICS records_deleted = ROW_COUNT;
  total_records := total_records + records_deleted;
  
  DELETE FROM rotation_orders WHERE organization_id = p_organization_id;
  GET DIAGNOSTICS records_deleted = ROW_COUNT;
  total_records := total_records + records_deleted;
  
  -- Survey and checkin
  DELETE FROM survey_responses WHERE organization_id = p_organization_id;
  GET DIAGNOSTICS records_deleted = ROW_COUNT;
  total_records := total_records + records_deleted;
  
  DELETE FROM checkin_sessions WHERE organization_id = p_organization_id;
  GET DIAGNOSTICS records_deleted = ROW_COUNT;
  total_records := total_records + records_deleted;
  
  DELETE FROM custom_checklists WHERE organization_id = p_organization_id;
  GET DIAGNOSTICS records_deleted = ROW_COUNT;
  total_records := total_records + records_deleted;
  
  -- Financial
  DELETE FROM receipts WHERE organization_id = p_organization_id;
  GET DIAGNOSTICS records_deleted = ROW_COUNT;
  total_records := total_records + records_deleted;
  
  DELETE FROM recurring_bills WHERE organization_id = p_organization_id;
  GET DIAGNOSTICS records_deleted = ROW_COUNT;
  total_records := total_records + records_deleted;
  
  DELETE FROM reservation_settings WHERE organization_id = p_organization_id;
  GET DIAGNOSTICS records_deleted = ROW_COUNT;
  total_records := total_records + records_deleted;
  
  -- Family groups
  DELETE FROM family_groups WHERE organization_id = p_organization_id;
  GET DIAGNOSTICS records_deleted = ROW_COUNT;
  total_records := total_records + records_deleted;
  
  -- User organization relationships
  DELETE FROM user_organizations WHERE organization_id = p_organization_id;
  GET DIAGNOSTICS records_deleted = ROW_COUNT;
  total_records := total_records + records_deleted;
  
  -- Finally delete the organization itself
  DELETE FROM organizations WHERE id = p_organization_id;
  GET DIAGNOSTICS records_deleted = ROW_COUNT;
  total_records := total_records + records_deleted;
  
  -- Log the operation
  INSERT INTO bulk_operation_audit (
    operation_type,
    records_affected,
    performed_by_user_id,
    organization_id,
    details
  ) VALUES (
    'ORGANIZATION_DELETION',
    total_records,
    auth.uid(),
    p_organization_id,
    jsonb_build_object(
      'organization_name', org_name,
      'confirmation_code', p_confirmation_code,
      'total_records_deleted', total_records
    )
  );
  
  RETURN format('Organization "%s" and all related data deleted successfully. Total records removed: %s', org_name, total_records);
END;
$function$;