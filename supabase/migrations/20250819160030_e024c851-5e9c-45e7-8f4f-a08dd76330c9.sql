-- Add access_type to organizations table
ALTER TABLE public.organizations 
ADD COLUMN access_type TEXT NOT NULL DEFAULT 'private' CHECK (access_type IN ('private', 'public_readonly', 'demo'));

-- Add guest access fields to organizations
ALTER TABLE public.organizations 
ADD COLUMN guest_access_token TEXT,
ADD COLUMN guest_token_expires_at TIMESTAMP WITH TIME ZONE;

-- Add user_type to profiles table  
ALTER TABLE public.profiles 
ADD COLUMN user_type TEXT NOT NULL DEFAULT 'regular' CHECK (user_type IN ('regular', 'guest_viewer', 'guest_admin'));

-- Create function to generate guest access token
CREATE OR REPLACE FUNCTION public.generate_guest_access_token(org_id UUID, expires_hours INTEGER DEFAULT 168)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  token TEXT;
  expiry_time TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Only allow organization admins to generate tokens
  IF NOT (is_organization_admin() AND validate_organization_access(org_id, 'generate_guest_token')) THEN
    RAISE EXCEPTION 'Access denied: Only organization admins can generate guest tokens';
  END IF;
  
  -- Generate random token
  token := encode(gen_random_bytes(32), 'base64url');
  expiry_time := NOW() + (expires_hours || ' hours')::INTERVAL;
  
  -- Update organization with new token
  UPDATE organizations 
  SET guest_access_token = token,
      guest_token_expires_at = expiry_time,
      updated_at = NOW()
  WHERE id = org_id;
  
  RETURN token;
END;
$$;

-- Create function to validate guest access
CREATE OR REPLACE FUNCTION public.validate_guest_access(org_id UUID, token TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  org_record RECORD;
BEGIN
  -- Get organization with token details
  SELECT access_type, guest_access_token, guest_token_expires_at
  INTO org_record
  FROM organizations 
  WHERE id = org_id;
  
  -- Check if organization exists and allows guest access
  IF NOT FOUND OR org_record.access_type = 'private' THEN
    RETURN FALSE;
  END IF;
  
  -- Check token match and expiry
  IF org_record.guest_access_token != token OR 
     org_record.guest_token_expires_at < NOW() THEN
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$$;

-- Create function to revoke guest access
CREATE OR REPLACE FUNCTION public.revoke_guest_access(org_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only allow organization admins to revoke tokens
  IF NOT (is_organization_admin() AND validate_organization_access(org_id, 'revoke_guest_token')) THEN
    RAISE EXCEPTION 'Access denied: Only organization admins can revoke guest tokens';
  END IF;
  
  -- Clear guest access token
  UPDATE organizations 
  SET guest_access_token = NULL,
      guest_token_expires_at = NULL,
      updated_at = NOW()
  WHERE id = org_id;
  
  RETURN TRUE;
END;
$$;

-- Update RLS policies to allow guest access for public organizations
CREATE POLICY "Guest users can view public readonly organizations" 
ON public.organizations 
FOR SELECT 
USING (access_type IN ('public_readonly', 'demo'));

-- Allow guest access to family groups for public organizations
CREATE POLICY "Guest users can view family groups in public organizations" 
ON public.family_groups 
FOR SELECT 
USING (
  organization_id IN (
    SELECT id FROM organizations 
    WHERE access_type IN ('public_readonly', 'demo')
  )
);

-- Allow guest access to features for public organizations
CREATE POLICY "Guest users can view features in public organizations" 
ON public.features 
FOR SELECT 
USING (
  organization_id IN (
    SELECT id FROM organizations 
    WHERE access_type IN ('public_readonly', 'demo')
  )
);

-- Allow guest access to reservations for public organizations (limited data)
CREATE POLICY "Guest users can view basic reservation info in public organizations" 
ON public.reservations 
FOR SELECT 
USING (
  organization_id IN (
    SELECT id FROM organizations 
    WHERE access_type IN ('public_readonly', 'demo')
  )
);

-- Allow guest access to documents for public organizations
CREATE POLICY "Guest users can view documents in public organizations" 
ON public.documents 
FOR SELECT 
USING (
  organization_id IN (
    SELECT id FROM organizations 
    WHERE access_type IN ('public_readonly', 'demo')
  )
);

-- Allow guest access to cabin rules for public organizations
CREATE POLICY "Guest users can view cabin rules in public organizations" 
ON public.cabin_rules 
FOR SELECT 
USING (
  organization_id IN (
    SELECT id FROM organizations 
    WHERE access_type IN ('public_readonly', 'demo')
  )
);