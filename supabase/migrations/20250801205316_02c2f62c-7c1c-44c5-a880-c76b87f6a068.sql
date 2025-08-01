-- Use supervisor privileges to delete all family groups for clean testing
-- First, let's check if there's a supervisor bulk delete function, if not create one
CREATE OR REPLACE FUNCTION public.supervisor_bulk_delete_family_groups(p_confirmation_code text)
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
  IF p_confirmation_code != 'CONFIRM_BULK_DELETE' THEN
    RAISE EXCEPTION 'Invalid confirmation code. Use CONFIRM_BULK_DELETE to proceed.';
  END IF;
  
  -- Delete all family groups
  DELETE FROM family_groups;
  
  GET DIAGNOSTICS affected_count = ROW_COUNT;
  
  RETURN affected_count;
END;
$function$;

-- Execute the deletion
SELECT supervisor_bulk_delete_family_groups('CONFIRM_BULK_DELETE');