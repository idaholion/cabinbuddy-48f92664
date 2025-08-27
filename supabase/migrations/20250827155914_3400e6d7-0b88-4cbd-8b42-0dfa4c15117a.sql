-- Create atomic organization creation function that handles both org and user linking
CREATE OR REPLACE FUNCTION public.create_organization_with_user_link(
  p_name text,
  p_code text,
  p_admin_name text DEFAULT NULL,
  p_admin_email text DEFAULT NULL,
  p_admin_phone text DEFAULT NULL,
  p_treasurer_name text DEFAULT NULL,
  p_treasurer_email text DEFAULT NULL,
  p_treasurer_phone text DEFAULT NULL,
  p_calendar_keeper_name text DEFAULT NULL,
  p_calendar_keeper_email text DEFAULT NULL,
  p_calendar_keeper_phone text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_user_id uuid;
  new_org_id uuid;
  existing_org_count integer;
BEGIN
  -- Get current user ID
  SELECT auth.uid() INTO current_user_id;
  
  IF current_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'User not authenticated'
    );
  END IF;
  
  -- Validate required parameters
  IF p_name IS NULL OR p_name = '' THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Organization name is required'
    );
  END IF;
  
  IF p_code IS NULL OR p_code = '' THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Organization code is required'
    );
  END IF;
  
  -- Check for duplicate organization code
  SELECT COUNT(*) INTO existing_org_count
  FROM organizations 
  WHERE code = p_code;
  
  IF existing_org_count > 0 THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'An organization with this code already exists. Please choose a different code.'
    );
  END IF;
  
  -- Create the organization
  INSERT INTO organizations (
    name,
    code,
    admin_name,
    admin_email,
    admin_phone,
    treasurer_name,
    treasurer_email,
    treasurer_phone,
    calendar_keeper_name,
    calendar_keeper_email,
    calendar_keeper_phone
  ) VALUES (
    p_name,
    p_code,
    p_admin_name,
    p_admin_email,
    p_admin_phone,
    p_treasurer_name,
    p_treasurer_email,
    p_treasurer_phone,
    p_calendar_keeper_name,
    p_calendar_keeper_email,
    p_calendar_keeper_phone
  ) RETURNING id INTO new_org_id;
  
  -- Link the user to the organization as admin
  INSERT INTO user_organizations (
    user_id,
    organization_id,
    role,
    is_primary
  ) VALUES (
    current_user_id,
    new_org_id,
    'admin',
    true
  );
  
  -- Return success with organization details
  RETURN jsonb_build_object(
    'success', true,
    'organization_id', new_org_id,
    'organization_name', p_name,
    'organization_code', p_code,
    'message', 'Organization created successfully'
  );
  
EXCEPTION
  WHEN OTHERS THEN
    -- Return detailed error information
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Failed to create organization: ' || SQLERRM,
      'error_code', SQLSTATE
    );
END;
$$;