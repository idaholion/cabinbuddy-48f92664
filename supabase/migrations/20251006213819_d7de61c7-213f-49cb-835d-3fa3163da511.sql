-- Update claim_family_member_profile to sync user email to family_groups.host_members
CREATE OR REPLACE FUNCTION public.claim_family_member_profile(
  p_organization_id uuid,
  p_family_group_name text,
  p_member_name text,
  p_member_type text DEFAULT 'host_member'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  current_user_id uuid;
  current_user_email text;
  group_exists boolean := false;
  member_exists boolean := false;
  already_claimed boolean := false;
  user_has_claim boolean := false;
  result jsonb;
BEGIN
  -- Get current user and email
  SELECT auth.uid() INTO current_user_id;
  SELECT email INTO current_user_email FROM auth.users WHERE id = current_user_id;
  
  IF current_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not authenticated');
  END IF;
  
  -- Verify organization access
  IF NOT validate_organization_access(p_organization_id, 'claim_profile') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Access denied to organization');
  END IF;
  
  -- Check if family group exists
  SELECT EXISTS(
    SELECT 1 FROM family_groups 
    WHERE organization_id = p_organization_id AND name = p_family_group_name
  ) INTO group_exists;
  
  IF NOT group_exists THEN
    RETURN jsonb_build_object('success', false, 'error', 'Family group not found');
  END IF;
  
  -- Check if member exists in the family group
  IF p_member_type = 'group_lead' THEN
    SELECT EXISTS(
      SELECT 1 FROM family_groups 
      WHERE organization_id = p_organization_id 
        AND name = p_family_group_name 
        AND lead_name IS NOT NULL
        AND (
          LOWER(TRIM(lead_name)) = LOWER(TRIM(p_member_name))
          OR LOWER(TRIM(lead_name)) LIKE LOWER(TRIM(p_member_name)) || '%'
          OR LOWER(TRIM(p_member_name)) LIKE LOWER(TRIM(lead_name)) || '%'
        )
    ) INTO member_exists;
  ELSE
    SELECT EXISTS(
      SELECT 1 FROM family_groups 
      WHERE organization_id = p_organization_id 
        AND name = p_family_group_name 
        AND host_members IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM jsonb_array_elements(host_members) AS member
          WHERE member->>'name' IS NOT NULL
            AND (
              LOWER(TRIM(member->>'name')) = LOWER(TRIM(p_member_name))
              OR LOWER(TRIM(member->>'name')) LIKE LOWER(TRIM(p_member_name)) || '%'
              OR LOWER(TRIM(p_member_name)) LIKE LOWER(TRIM(member->>'name')) || '%'
            )
        )
    ) INTO member_exists;
  END IF;
  
  IF NOT member_exists THEN
    RETURN jsonb_build_object('success', false, 'error', 'Member name not found in family group');
  END IF;
  
  -- Check if this profile slot is already claimed
  SELECT EXISTS(
    SELECT 1 FROM member_profile_links
    WHERE organization_id = p_organization_id
      AND family_group_name = p_family_group_name
      AND member_name = p_member_name
      AND member_type = p_member_type
      AND claimed_by_user_id IS NOT NULL
  ) INTO already_claimed;
  
  IF already_claimed THEN
    RETURN jsonb_build_object('success', false, 'error', 'This profile has already been claimed by another user');
  END IF;
  
  -- Check if user already has a claim in this organization
  SELECT EXISTS(
    SELECT 1 FROM member_profile_links
    WHERE organization_id = p_organization_id
      AND claimed_by_user_id = current_user_id
  ) INTO user_has_claim;
  
  IF user_has_claim THEN
    RETURN jsonb_build_object('success', false, 'error', 'You have already claimed a profile in this organization');
  END IF;
  
  -- Create the profile link
  INSERT INTO member_profile_links (
    organization_id,
    family_group_name,
    member_name,
    member_type,
    claimed_by_user_id,
    claimed_at
  ) VALUES (
    p_organization_id,
    p_family_group_name,
    p_member_name,
    p_member_type,
    current_user_id,
    now()
  );
  
  -- Update user's profile with organization and family group
  UPDATE profiles
  SET 
    organization_id = p_organization_id,
    family_group = p_family_group_name,
    updated_at = now()
  WHERE user_id = current_user_id;
  
  -- Sync email to family_groups.host_members if it's a host member
  IF p_member_type = 'host_member' AND current_user_email IS NOT NULL THEN
    UPDATE family_groups
    SET 
      host_members = (
        SELECT jsonb_agg(
          CASE 
            WHEN member->>'name' = p_member_name THEN
              jsonb_set(member, '{email}', to_jsonb(current_user_email))
            ELSE member
          END
        )
        FROM jsonb_array_elements(host_members) AS member
      ),
      updated_at = now()
    WHERE organization_id = p_organization_id 
      AND name = p_family_group_name;
  END IF;
  
  -- Sync email to lead_email if it's a group lead
  IF p_member_type = 'group_lead' AND current_user_email IS NOT NULL THEN
    UPDATE family_groups
    SET 
      lead_email = current_user_email,
      updated_at = now()
    WHERE organization_id = p_organization_id 
      AND name = p_family_group_name;
  END IF;
  
  RETURN jsonb_build_object(
    'success', true, 
    'message', 'Profile claimed successfully and email synced',
    'family_group', p_family_group_name,
    'member_name', p_member_name,
    'member_type', p_member_type
  );
END;
$$;