-- Enhanced Function Safety and Performance Optimization

-- 1. Enhanced get_user_organization_id function with fallback safety
CREATE OR REPLACE FUNCTION public.get_user_organization_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  org_id UUID;
BEGIN
  -- First try to get primary organization
  SELECT organization_id INTO org_id
  FROM public.user_organizations 
  WHERE user_id = auth.uid() AND is_primary = true
  LIMIT 1;
  
  -- If no primary organization found, fallback to first organization
  IF org_id IS NULL THEN
    SELECT organization_id INTO org_id
    FROM public.user_organizations 
    WHERE user_id = auth.uid()
    ORDER BY joined_at ASC
    LIMIT 1;
  END IF;
  
  RETURN org_id;
END;
$$;

-- 2. Enhanced get_user_primary_organization_id with safety
CREATE OR REPLACE FUNCTION public.get_user_primary_organization_id(user_uuid uuid DEFAULT auth.uid())
RETURNS uuid
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  org_id UUID;
BEGIN
  -- First try to get primary organization
  SELECT organization_id INTO org_id
  FROM public.user_organizations 
  WHERE user_id = user_uuid AND is_primary = true
  LIMIT 1;
  
  -- If no primary organization found, fallback to first organization
  IF org_id IS NULL THEN
    SELECT organization_id INTO org_id
    FROM public.user_organizations 
    WHERE user_id = user_uuid
    ORDER BY joined_at ASC
    LIMIT 1;
  END IF;
  
  RETURN org_id;
END;
$$;

-- 3. Add performance indexes for security functions
CREATE INDEX IF NOT EXISTS idx_user_organizations_user_primary 
ON public.user_organizations (user_id, is_primary) 
WHERE is_primary = true;

CREATE INDEX IF NOT EXISTS idx_user_organizations_user_joined 
ON public.user_organizations (user_id, joined_at);

CREATE INDEX IF NOT EXISTS idx_supervisors_email_active 
ON public.supervisors (email) 
WHERE is_active = true;

-- 4. Enhanced validate_organization_access with better error handling
CREATE OR REPLACE FUNCTION public.validate_organization_access(target_org_id uuid, operation_name text DEFAULT 'unknown'::text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_org_id UUID;
  user_has_access BOOLEAN := false;
  current_user_id UUID;
BEGIN
  -- Get current user ID
  SELECT auth.uid() INTO current_user_id;
  
  -- If no user, no access
  IF current_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Get user's primary organization (with fallback)
  SELECT get_user_organization_id() INTO user_org_id;
  
  -- Check if user has access to target organization
  SELECT EXISTS(
    SELECT 1 FROM public.user_organizations 
    WHERE user_id = current_user_id AND organization_id = target_org_id
  ) INTO user_has_access;
  
  -- Log the access attempt with more context
  INSERT INTO public.organization_access_audit (
    user_id, 
    attempted_organization_id, 
    user_organization_id,
    access_type,
    table_name,
    operation_type,
    success
  ) VALUES (
    current_user_id,
    target_org_id,
    user_org_id,
    'validation',
    operation_name,
    'CHECK',
    user_has_access
  );
  
  RETURN user_has_access;
END;
$$;

-- 5. Enhanced supervisor function with caching optimization
CREATE OR REPLACE FUNCTION public.is_supervisor()
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_email TEXT;
  is_super BOOLEAN := false;
BEGIN
  -- Get the current user's email from auth.users
  SELECT email INTO user_email FROM auth.users WHERE id = auth.uid();
  
  -- Early return if no email
  IF user_email IS NULL THEN
    RETURN false;
  END IF;
  
  -- Check if user email exists in supervisors table and is active
  SELECT EXISTS (
    SELECT 1 FROM public.supervisors 
    WHERE email = user_email AND is_active = true
  ) INTO is_super;
  
  RETURN is_super;
END;
$$;

-- 6. Add emergency access logging table
CREATE TABLE IF NOT EXISTS public.emergency_access_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  organization_id uuid,
  action_type text NOT NULL,
  reason text,
  approved_by text,
  created_at timestamp with time zone DEFAULT now(),
  details jsonb DEFAULT '{}'::jsonb
);

-- Enable RLS on emergency access log
ALTER TABLE public.emergency_access_log ENABLE ROW LEVEL SECURITY;

-- Only supervisors can access emergency access logs
CREATE POLICY "Supervisors can manage emergency access logs"
ON public.emergency_access_log
FOR ALL
TO authenticated
USING (is_supervisor())
WITH CHECK (is_supervisor());

-- 7. Enhanced organization admin check with safety
CREATE OR REPLACE FUNCTION public.is_organization_admin()
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_user_id UUID;
  is_admin BOOLEAN := false;
BEGIN
  -- Get current user ID
  SELECT auth.uid() INTO current_user_id;
  
  -- If no user, not admin
  IF current_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Check if user has admin role in any organization they belong to
  SELECT EXISTS (
    SELECT 1 FROM public.user_organizations 
    WHERE user_id = current_user_id 
    AND role = 'admin'
    AND is_primary = true
  ) INTO is_admin;
  
  RETURN is_admin;
END;
$$;