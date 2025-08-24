-- Update the supervisor function to allow organization admins as well
CREATE OR REPLACE FUNCTION public.supervisor_remove_user_from_organization(
  p_user_email text, 
  p_organization_id uuid, 
  p_confirmation_code text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  target_user_id uuid;
  user_exists_in_org boolean;
  records_deleted integer := 0;
BEGIN
  -- Verify supervisor permission OR organization admin permission
  IF NOT (is_supervisor() OR (is_organization_admin() AND validate_organization_access(p_organization_id, 'remove_user'))) THEN
    RAISE EXCEPTION 'This function requires supervisor privileges or organization admin privileges';
  END IF;
  
  -- Verify confirmation code
  IF p_confirmation_code != 'CONFIRM_REMOVE_USER' THEN
    RAISE EXCEPTION 'Invalid confirmation code. Use CONFIRM_REMOVE_USER to proceed.';
  END IF;
  
  -- Get the user ID from email
  SELECT id INTO target_user_id 
  FROM auth.users 
  WHERE email = p_user_email;
  
  IF target_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'User not found with email: ' || p_user_email
    );
  END IF;
  
  -- Check if user exists in the organization
  SELECT EXISTS(
    SELECT 1 FROM user_organizations 
    WHERE user_id = target_user_id AND organization_id = p_organization_id
  ) INTO user_exists_in_org;
  
  IF NOT user_exists_in_org THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'User is not a member of this organization'
    );
  END IF;
  
  -- Remove user from organization
  DELETE FROM user_organizations 
  WHERE user_id = target_user_id AND organization_id = p_organization_id;
  
  GET DIAGNOSTICS records_deleted = ROW_COUNT;
  
  -- Remove any profile claims
  DELETE FROM member_profile_links 
  WHERE claimed_by_user_id = target_user_id AND organization_id = p_organization_id;
  
  -- Log the operation
  INSERT INTO bulk_operation_audit (
    operation_type,
    records_affected,
    performed_by_user_id,
    organization_id,
    details
  ) VALUES (
    'USER_REMOVAL',
    records_deleted,
    auth.uid(),
    p_organization_id,
    jsonb_build_object(
      'removed_user_email', p_user_email,
      'removed_user_id', target_user_id,
      'confirmation_code', p_confirmation_code
    )
  );
  
  RETURN jsonb_build_object(
    'success', true, 
    'message', 'User successfully removed from organization',
    'user_email', p_user_email,
    'records_deleted', records_deleted
  );
END;
$function$;