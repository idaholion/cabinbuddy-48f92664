-- Fix the organizations table RLS policies to ensure proper authentication
-- First, drop existing policies to replace them with secure ones

DROP POLICY IF EXISTS "Authenticated users can create organizations" ON public.organizations;
DROP POLICY IF EXISTS "Authenticated users can update their organization" ON public.organizations;
DROP POLICY IF EXISTS "Authenticated users can view their organization" ON public.organizations;
DROP POLICY IF EXISTS "Supervisors can manage all organizations" ON public.organizations;
DROP POLICY IF EXISTS "Supervisors can view all organizations" ON public.organizations;

-- Create secure RLS policies that require proper authentication

-- Policy for creating organizations - only authenticated users
CREATE POLICY "Authenticated users can create organizations" 
ON public.organizations 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- Policy for viewing organizations - only authenticated users who belong to the organization
CREATE POLICY "Users can view their own organization" 
ON public.organizations 
FOR SELECT 
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND id = get_user_organization_id()
);

-- Policy for updating organizations - only authenticated users who belong to the organization
CREATE POLICY "Users can update their own organization" 
ON public.organizations 
FOR UPDATE 
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND id = get_user_organization_id()
)
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND id = get_user_organization_id()
);

-- Supervisor policies - allow supervisors to view and manage all organizations
CREATE POLICY "Supervisors can view all organizations" 
ON public.organizations 
FOR SELECT 
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND is_supervisor()
);

CREATE POLICY "Supervisors can manage all organizations" 
ON public.organizations 
FOR ALL 
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND is_supervisor()
)
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND is_supervisor()
);

-- Ensure RLS is enabled on the organizations table
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Also ensure that default grants don't allow public access
-- Revoke any public permissions that might exist
REVOKE ALL ON public.organizations FROM PUBLIC;
REVOKE ALL ON public.organizations FROM anon;