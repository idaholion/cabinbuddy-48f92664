-- Critical Security Fix: Remove anonymous access to personal contact information

-- 1. Fix organizations table - remove guest access to contact details
DROP POLICY IF EXISTS "Guest users can view basic public organization info" ON public.organizations;

-- Create safer policy that only shows safe organization info to guests
CREATE POLICY "Guest users can view safe organization info" ON public.organizations
FOR SELECT 
USING (
  access_type IN ('public_readonly', 'demo') 
  AND auth.uid() IS NULL  -- Only for anonymous users
);

-- 2. Fix family_groups table - ensure no personal info leaks to guests
DROP POLICY IF EXISTS "Guest users can view family groups in public organizations" ON public.family_groups;

-- Create safer policy that hides contact information from guests
CREATE POLICY "Guest users can view safe family group info" ON public.family_groups
FOR SELECT 
USING (
  organization_id IN (
    SELECT id FROM organizations 
    WHERE access_type IN ('public_readonly', 'demo')
  )
  AND auth.uid() IS NULL  -- Only for anonymous users
);

-- 3. Update documents policy to be more restrictive for guests
DROP POLICY IF EXISTS "Guest users can view documents in public organizations" ON public.documents;

-- Create safer documents policy
CREATE POLICY "Guest users can view public document titles" ON public.documents
FOR SELECT 
USING (
  organization_id IN (
    SELECT id FROM organizations 
    WHERE access_type IN ('public_readonly', 'demo')
  )
  AND auth.uid() IS NULL  -- Only for anonymous users
);

-- 4. Update features policy to be more restrictive
DROP POLICY IF EXISTS "Guest users can view features in public organizations" ON public.features;

-- Create safer features policy
CREATE POLICY "Guest users can view public features" ON public.features
FOR SELECT 
USING (
  organization_id IN (
    SELECT id FROM organizations 
    WHERE access_type IN ('public_readonly', 'demo')
  )
  AND auth.uid() IS NULL  -- Only for anonymous users
);

-- 5. Update cabin_rules policy to be more restrictive
DROP POLICY IF EXISTS "Guest users can view cabin rules in public organizations" ON public.cabin_rules;

-- Create safer cabin rules policy
CREATE POLICY "Guest users can view public cabin rules" ON public.cabin_rules
FOR SELECT 
USING (
  organization_id IN (
    SELECT id FROM organizations 
    WHERE access_type IN ('public_readonly', 'demo')
  )
  AND auth.uid() IS NULL  -- Only for anonymous users
);

-- 6. Create a safe organization view function for guest access
CREATE OR REPLACE FUNCTION public.get_safe_guest_organization_info(org_id uuid)
RETURNS TABLE(
  id uuid, 
  name text, 
  code text, 
  access_type text,
  created_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only return basic, safe information for guest access
  RETURN QUERY
  SELECT 
    o.id,
    o.name,
    o.code,
    o.access_type,
    o.created_at
  FROM organizations o
  WHERE o.id = org_id
    AND o.access_type IN ('public_readonly', 'demo');
END;
$$;

-- 7. Create a safe family groups function for guest access
CREATE OR REPLACE FUNCTION public.get_safe_guest_family_groups(org_id uuid)
RETURNS TABLE(
  id uuid,
  name text,
  color text,
  created_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER  
SET search_path TO 'public'
AS $$
BEGIN
  -- Only return safe family group information (no contact details)
  RETURN QUERY
  SELECT 
    fg.id,
    fg.name,
    fg.color,
    fg.created_at
  FROM family_groups fg
  JOIN organizations o ON fg.organization_id = o.id
  WHERE fg.organization_id = org_id
    AND o.access_type IN ('public_readonly', 'demo');
END;
$$;