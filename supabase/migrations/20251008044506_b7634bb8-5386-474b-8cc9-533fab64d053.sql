-- Create supervisor function to fix Trent's email
CREATE OR REPLACE FUNCTION public.supervisor_fix_user_email(
  p_old_email text,
  p_new_email text,
  p_confirmation_code text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_user_id uuid;
  email_exists boolean;
BEGIN
  -- Verify supervisor permission
  IF NOT is_supervisor() THEN
    RAISE EXCEPTION 'This function requires supervisor privileges';
  END IF;
  
  -- Verify confirmation code
  IF p_confirmation_code != 'CONFIRM_EMAIL_FIX' THEN
    RAISE EXCEPTION 'Invalid confirmation code. Use CONFIRM_EMAIL_FIX to proceed.';
  END IF;
  
  -- Get the user ID from old email
  SELECT id INTO target_user_id 
  FROM auth.users 
  WHERE email = p_old_email;
  
  IF target_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'User not found with email: ' || p_old_email
    );
  END IF;
  
  -- Check if new email already exists
  SELECT EXISTS(
    SELECT 1 FROM auth.users WHERE email = p_new_email
  ) INTO email_exists;
  
  IF email_exists THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Email already in use: ' || p_new_email
    );
  END IF;
  
  -- Update the email in auth.users
  UPDATE auth.users 
  SET 
    email = p_new_email,
    updated_at = now()
  WHERE id = target_user_id;
  
  -- Log the operation
  INSERT INTO bulk_operation_audit (
    operation_type,
    records_affected,
    performed_by_user_id,
    details
  ) VALUES (
    'EMAIL_CORRECTION',
    1,
    auth.uid(),
    jsonb_build_object(
      'old_email', p_old_email,
      'new_email', p_new_email,
      'user_id', target_user_id,
      'confirmation_code', p_confirmation_code
    )
  );
  
  RETURN jsonb_build_object(
    'success', true, 
    'message', 'Email updated successfully',
    'old_email', p_old_email,
    'new_email', p_new_email
  );
END;
$$;