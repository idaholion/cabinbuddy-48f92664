-- Fix critical organizations table security vulnerability
-- The current policies allow anonymous access - we need to enforce authentication

-- Drop existing potentially vulnerable policies and recreate them securely
DROP POLICY IF EXISTS "Users can view their own organization" ON public.organizations;
DROP POLICY IF EXISTS "Users can update their own organization" ON public.organizations;
DROP POLICY IF EXISTS "Supervisors can view all organizations" ON public.organizations;
DROP POLICY IF EXISTS "Supervisors can manage all organizations" ON public.organizations;
DROP POLICY IF EXISTS "Authenticated users can create organizations" ON public.organizations;

-- Recreate policies with explicit authentication requirements
CREATE POLICY "Authenticated users can view their organization" 
ON public.organizations 
FOR SELECT 
TO authenticated 
USING (
  auth.uid() IS NOT NULL 
  AND id = get_user_organization_id()
);

CREATE POLICY "Authenticated users can update their organization" 
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

CREATE POLICY "Authenticated users can create organizations" 
ON public.organizations 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated supervisors can view all organizations" 
ON public.organizations 
FOR SELECT 
TO authenticated 
USING (
  auth.uid() IS NOT NULL 
  AND is_supervisor()
);

CREATE POLICY "Authenticated supervisors can manage all organizations" 
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