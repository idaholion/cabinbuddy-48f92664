-- Comprehensive security fix: Ensure all RLS policies restrict access to authenticated users only
-- This fixes the core security vulnerability where sensitive data could be accessed by anonymous users

-- Fix profiles table
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles; 
DROP POLICY IF EXISTS "Users can delete their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Supervisors can manage all profiles" ON public.profiles;

CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
TO authenticated
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id)
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Users can delete their own profile" 
ON public.profiles 
FOR DELETE 
TO authenticated
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Supervisors can manage all profiles" 
ON public.profiles 
FOR ALL 
TO authenticated
USING (auth.uid() IS NOT NULL AND is_supervisor())
WITH CHECK (auth.uid() IS NOT NULL AND is_supervisor());

-- Fix user_organizations table
DROP POLICY IF EXISTS "Users can view their own organization memberships" ON public.user_organizations;
DROP POLICY IF EXISTS "Users can update their own organization memberships" ON public.user_organizations;
DROP POLICY IF EXISTS "Users can insert their own organization memberships" ON public.user_organizations;
DROP POLICY IF EXISTS "Users can delete their own organization memberships" ON public.user_organizations;
DROP POLICY IF EXISTS "Supervisors can view all organization memberships" ON public.user_organizations;
DROP POLICY IF EXISTS "Supervisors can manage all organization memberships" ON public.user_organizations;

CREATE POLICY "Users can view their own organization memberships" 
ON public.user_organizations 
FOR SELECT 
TO authenticated
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Users can update their own organization memberships" 
ON public.user_organizations 
FOR UPDATE 
TO authenticated
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id)
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Users can insert their own organization memberships" 
ON public.user_organizations 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Users can delete their own organization memberships" 
ON public.user_organizations 
FOR DELETE 
TO authenticated
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Supervisors can view all organization memberships" 
ON public.user_organizations 
FOR SELECT 
TO authenticated
USING (auth.uid() IS NOT NULL AND is_supervisor());

CREATE POLICY "Supervisors can manage all organization memberships" 
ON public.user_organizations 
FOR ALL 
TO authenticated
USING (auth.uid() IS NOT NULL AND is_supervisor())
WITH CHECK (auth.uid() IS NOT NULL AND is_supervisor());

-- Revoke any remaining public access from critical tables
REVOKE ALL ON public.profiles FROM PUBLIC;
REVOKE ALL ON public.profiles FROM anon;
REVOKE ALL ON public.user_organizations FROM PUBLIC;
REVOKE ALL ON public.user_organizations FROM anon;