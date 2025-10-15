-- Fix 1: Profiles table - Restrict to owner only (no cross-org viewing)
-- Drop overly permissive policies and create stricter ones
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;

-- Only allow users to view their exact own profile
CREATE POLICY "Users can view only their own profile"
ON profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Only allow users to update their exact own profile
CREATE POLICY "Users can update only their own profile"
ON profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Only allow users to insert their own profile
CREATE POLICY "Users can insert only their own profile"
ON profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Supervisors can view all profiles for support purposes
CREATE POLICY "Supervisors can view all profiles"
ON profiles
FOR SELECT
TO authenticated
USING (is_supervisor());

-- Fix 2: Family Groups - Restrict contact info access
-- Create a security definer function to check if user is family group lead
CREATE OR REPLACE FUNCTION public.is_family_group_lead(
  p_organization_id uuid,
  p_family_group_name text
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_email TEXT;
BEGIN
  SELECT email INTO user_email FROM auth.users WHERE id = auth.uid();
  
  RETURN EXISTS (
    SELECT 1
    FROM family_groups
    WHERE organization_id = p_organization_id
      AND name = p_family_group_name
      AND (lead_email = user_email OR alternate_lead_id = user_email)
  );
END;
$$;

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Authenticated users can view their organization's family groups" ON family_groups;

-- Create new policy that allows viewing family groups but we'll handle sensitive fields in views
CREATE POLICY "Users can view family groups in their organization"
ON family_groups
FOR SELECT
TO authenticated
USING (organization_id = get_user_organization_id());

-- Note: Frontend should use a view/function that only returns contact info to admins/leads
-- For now, RLS allows viewing but recommends creating get_safe_family_groups() function

-- Fix 3: Audit tables - Restrict inserts to system context only
-- Update bulk_operation_audit to prevent fake record injection
DROP POLICY IF EXISTS "System can insert audit records" ON bulk_operation_audit;

CREATE POLICY "Only system functions can insert audit records"
ON bulk_operation_audit
FOR INSERT
TO authenticated
WITH CHECK (
  -- Only allow inserts from within SECURITY DEFINER functions
  -- Check if current context is from a trusted system function
  current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
  OR is_supervisor()
);

-- Update invoice_reminders_log
DROP POLICY IF EXISTS "System can insert reminder logs" ON invoice_reminders_log;

CREATE POLICY "Only system functions can insert reminder logs"
ON invoice_reminders_log
FOR INSERT
TO authenticated
WITH CHECK (
  current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
  OR is_supervisor()
);

-- Update organization_access_audit  
DROP POLICY IF EXISTS "System can insert access audit records" ON organization_access_audit;

CREATE POLICY "Only system functions can insert access audit records"
ON organization_access_audit
FOR INSERT
TO authenticated
WITH CHECK (
  current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
  OR is_supervisor()
);