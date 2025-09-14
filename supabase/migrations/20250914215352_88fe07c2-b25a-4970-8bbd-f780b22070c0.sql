-- Create supervisor function to reset user password
CREATE OR REPLACE FUNCTION public.supervisor_reset_user_password(
  p_user_email text,
  p_new_password text,
  p_confirmation_code text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  target_user_id uuid;
BEGIN
  -- Verify supervisor permission
  IF NOT is_supervisor() THEN
    RAISE EXCEPTION 'This function requires supervisor privileges';
  END IF;
  
  -- Verify confirmation code
  IF p_confirmation_code != 'CONFIRM_PASSWORD_RESET' THEN
    RAISE EXCEPTION 'Invalid confirmation code. Use CONFIRM_PASSWORD_RESET to proceed.';
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
  
  -- Update the password in auth.users
  UPDATE auth.users 
  SET 
    encrypted_password = crypt(p_new_password, gen_salt('bf')),
    updated_at = now(),
    password_hash = crypt(p_new_password, gen_salt('bf'))
  WHERE id = target_user_id;
  
  -- Log the operation
  INSERT INTO bulk_operation_audit (
    operation_type,
    records_affected,
    performed_by_user_id,
    details
  ) VALUES (
    'PASSWORD_RESET',
    1,
    auth.uid(),
    jsonb_build_object(
      'target_user_email', p_user_email,
      'target_user_id', target_user_id,
      'confirmation_code', p_confirmation_code
    )
  );
  
  RETURN jsonb_build_object(
    'success', true, 
    'message', 'Password reset successfully',
    'user_email', p_user_email
  );
END;
$$;