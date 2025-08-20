-- Create member profile links table for name-based claiming
CREATE TABLE public.member_profile_links (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL,
  family_group_name text NOT NULL,
  member_name text NOT NULL,
  member_type text NOT NULL DEFAULT 'host_member', -- 'group_lead' or 'host_member'
  claimed_by_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  claimed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  
  -- Ensure one user can only claim one profile per organization
  UNIQUE(organization_id, claimed_by_user_id),
  -- Ensure each member slot can only be claimed once
  UNIQUE(organization_id, family_group_name, member_name, member_type)
);

-- Enable RLS
ALTER TABLE public.member_profile_links ENABLE ROW LEVEL SECURITY;

-- Create policies for member profile links
CREATE POLICY "Users can view their organization's profile links"
ON public.member_profile_links
FOR SELECT
USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can create profile links for their organization"
ON public.member_profile_links
FOR INSERT
WITH CHECK (
  organization_id = get_user_organization_id() 
  AND claimed_by_user_id = auth.uid()
);

CREATE POLICY "Supervisors can manage all profile links"
ON public.member_profile_links
FOR ALL
USING (is_supervisor());

-- Create function to handle profile claiming with intelligent name matching
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
  group_exists boolean := false;
  member_exists boolean := false;
  already_claimed boolean := false;
  user_has_claim boolean := false;
  result jsonb;
BEGIN
  -- Get current user
  SELECT auth.uid() INTO current_user_id;
  
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
  
  RETURN jsonb_build_object(
    'success', true, 
    'message', 'Profile claimed successfully',
    'family_group', p_family_group_name,
    'member_name', p_member_name,
    'member_type', p_member_type
  );
END;
$$;

-- Create function to get user's claimed profile
CREATE OR REPLACE FUNCTION public.get_user_claimed_profile(p_organization_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  current_user_id uuid;
  profile_link RECORD;
BEGIN
  SELECT auth.uid() INTO current_user_id;
  
  IF current_user_id IS NULL THEN
    RETURN NULL;
  END IF;
  
  SELECT * INTO profile_link
  FROM member_profile_links
  WHERE organization_id = p_organization_id
    AND claimed_by_user_id = current_user_id;
    
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  
  RETURN jsonb_build_object(
    'family_group_name', profile_link.family_group_name,
    'member_name', profile_link.member_name,
    'member_type', profile_link.member_type,
    'claimed_at', profile_link.claimed_at
  );
END;
$$;

-- Create trigger to update timestamps
CREATE TRIGGER update_member_profile_links_updated_at
BEFORE UPDATE ON public.member_profile_links
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();