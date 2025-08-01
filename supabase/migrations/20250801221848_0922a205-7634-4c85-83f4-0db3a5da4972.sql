-- Fix the supervisor_reset_database function to use proper WHERE clauses
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
  -- Using WHERE true to satisfy PostgreSQL's DELETE safety requirement
  
  -- Clear user-organization relationships
  DELETE FROM user_organizations WHERE true;
  tables_cleared := array_append(tables_cleared, 'user_organizations');
  
  -- Clear all organization-specific data
  DELETE FROM calendar_keeper_requests WHERE true;
  tables_cleared := array_append(tables_cleared, 'calendar_keeper_requests');
  
  DELETE FROM work_weekend_approvals WHERE true;
  tables_cleared := array_append(tables_cleared, 'work_weekend_approvals');
  
  DELETE FROM work_weekends WHERE true;
  tables_cleared := array_append(tables_cleared, 'work_weekends');
  
  DELETE FROM trade_notifications WHERE true;
  tables_cleared := array_append(tables_cleared, 'trade_notifications');
  
  DELETE FROM trade_requests WHERE true;
  tables_cleared := array_append(tables_cleared, 'trade_requests');
  
  DELETE FROM notification_log WHERE true;
  tables_cleared := array_append(tables_cleared, 'notification_log');
  
  DELETE FROM time_period_usage WHERE true;
  tables_cleared := array_append(tables_cleared, 'time_period_usage');
  
  DELETE FROM secondary_selection_status WHERE true;
  tables_cleared := array_append(tables_cleared, 'secondary_selection_status');
  
  DELETE FROM reservations WHERE true;
  tables_cleared := array_append(tables_cleared, 'reservations');
  
  DELETE FROM reservation_periods WHERE true;
  tables_cleared := array_append(tables_cleared, 'reservation_periods');
  
  DELETE FROM rotation_orders WHERE true;
  tables_cleared := array_append(tables_cleared, 'rotation_orders');
  
  DELETE FROM survey_responses WHERE true;
  tables_cleared := array_append(tables_cleared, 'survey_responses');
  
  DELETE FROM checkin_sessions WHERE true;
  tables_cleared := array_append(tables_cleared, 'checkin_sessions');
  
  DELETE FROM custom_checklists WHERE true;
  tables_cleared := array_append(tables_cleared, 'custom_checklists');
  
  DELETE FROM receipts WHERE true;
  tables_cleared := array_append(tables_cleared, 'receipts');
  
  DELETE FROM recurring_bills WHERE true;
  tables_cleared := array_append(tables_cleared, 'recurring_bills');
  
  DELETE FROM reservation_settings WHERE true;
  tables_cleared := array_append(tables_cleared, 'reservation_settings');
  
  DELETE FROM family_groups WHERE true;
  tables_cleared := array_append(tables_cleared, 'family_groups');
  
  DELETE FROM organizations WHERE true;
  tables_cleared := array_append(tables_cleared, 'organizations');
  
  -- Clear profiles (but auth.users remains for login)
  DELETE FROM profiles WHERE true;
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