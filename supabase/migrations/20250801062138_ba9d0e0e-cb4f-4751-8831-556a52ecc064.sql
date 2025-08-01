-- Update all remaining RLS policies to properly require authentication
-- This addresses the anonymous access warnings

-- Fix remaining policies that need authentication
-- custom_checklists
DROP POLICY IF EXISTS "Authenticated users can manage their organization's checklists" ON public.custom_checklists;
DROP POLICY IF EXISTS "Authenticated users can view their organization's checklists" ON public.custom_checklists;
DROP POLICY IF EXISTS "Supervisors can manage all custom checklists" ON public.custom_checklists;
DROP POLICY IF EXISTS "Supervisors can view all custom checklists" ON public.custom_checklists;

CREATE POLICY "Users can manage their organization's checklists" 
ON public.custom_checklists FOR ALL 
TO authenticated
USING (auth.uid() IS NOT NULL AND organization_id = get_user_organization_id());

CREATE POLICY "Supervisors can manage all custom checklists" 
ON public.custom_checklists FOR ALL 
TO authenticated
USING (auth.uid() IS NOT NULL AND is_supervisor());

-- Update profiles policies to be more restrictive
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can delete their own profile" ON public.profiles;

CREATE POLICY "Users can view their own profile" 
ON public.profiles FOR SELECT 
TO authenticated
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles FOR UPDATE 
TO authenticated
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Users can delete their own profile" 
ON public.profiles FOR DELETE 
TO authenticated
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- Fix organization_access_audit policy
DROP POLICY IF EXISTS "Supervisors can view all access audit logs" ON public.organization_access_audit;

CREATE POLICY "Supervisors can view all access audit logs" 
ON public.organization_access_audit FOR SELECT 
TO authenticated
USING (auth.uid() IS NOT NULL AND is_supervisor());

-- Note: Some warnings about anonymous access are expected for certain operations
-- as they are needed for supervisor functions and audit logging.
-- The remaining warnings are mostly about auth configuration settings
-- that need to be adjusted in the Supabase dashboard, not through SQL.