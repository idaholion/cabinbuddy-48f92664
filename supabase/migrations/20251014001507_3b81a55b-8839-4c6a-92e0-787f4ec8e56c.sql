
-- Create a supervisor function to manually claim a profile
CREATE OR REPLACE FUNCTION public.supervisor_manual_claim_profile(
  p_user_id uuid,
  p_organization_id uuid,
  p_family_group_name text,
  p_member_name text,
  p_member_type text,
  p_user_email text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Verify supervisor permission
  IF NOT is_supervisor() THEN
    RAISE EXCEPTION 'This function requires supervisor privileges';
  END IF;

  -- Delete any existing claim
  DELETE FROM member_profile_links
  WHERE organization_id = p_organization_id
    AND family_group_name = p_family_group_name
    AND member_name = p_member_name;

  -- Create the profile claim
  INSERT INTO member_profile_links (
    organization_id,
    family_group_name,
    member_name,
    member_type,
    claimed_by_user_id,
    claimed_at,
    created_at,
    updated_at
  )
  VALUES (
    p_organization_id,
    p_family_group_name,
    p_member_name,
    p_member_type,
    p_user_id,
    now(),
    now(),
    now()
  );

  -- Update the profiles table
  UPDATE profiles
  SET family_group = p_family_group_name,
      family_role = CASE WHEN p_member_type = 'group_lead' THEN 'lead' ELSE 'member' END,
      organization_id = p_organization_id,
      updated_at = now()
  WHERE user_id = p_user_id;

  -- If no profile exists, create one
  INSERT INTO profiles (
    user_id,
    family_group,
    family_role,
    display_name,
    organization_id,
    created_at,
    updated_at
  )
  SELECT 
    p_user_id,
    p_family_group_name,
    CASE WHEN p_member_type = 'group_lead' THEN 'lead' ELSE 'member' END,
    p_member_name,
    p_organization_id,
    now(),
    now()
  WHERE NOT EXISTS (
    SELECT 1 FROM profiles WHERE user_id = p_user_id
  );

  -- Update family_groups with the user's email
  IF p_member_type = 'host_member' THEN
    UPDATE family_groups
    SET host_members = (
      SELECT jsonb_agg(
        CASE 
          WHEN member->>'name' = p_member_name
          THEN jsonb_set(
            member,
            '{email}',
            to_jsonb(p_user_email)
          )
          ELSE member
        END
      )
      FROM jsonb_array_elements(host_members) AS member
    ),
    updated_at = now()
    WHERE organization_id = p_organization_id
      AND name = p_family_group_name;
  ELSE
    UPDATE family_groups
    SET lead_email = p_user_email,
        updated_at = now()
    WHERE organization_id = p_organization_id
      AND name = p_family_group_name;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Profile claimed successfully',
    'user_id', p_user_id,
    'family_group', p_family_group_name,
    'member_name', p_member_name
  );
END;
$$;
