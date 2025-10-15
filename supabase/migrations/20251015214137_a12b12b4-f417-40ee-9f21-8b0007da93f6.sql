
-- Create a security definer function to check organization membership
-- This bypasses RLS on user_organizations table so the payments policy can work
CREATE OR REPLACE FUNCTION public.user_belongs_to_organization(
  p_user_id uuid,
  p_organization_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_organizations
    WHERE user_id = p_user_id
      AND organization_id = p_organization_id
  );
$$;

-- Now update the payments INSERT policy to use this function
DROP POLICY IF EXISTS "Users can create payments in their organization" ON payments;

CREATE POLICY "Users can create payments in their organization"
ON payments
FOR INSERT
TO authenticated
WITH CHECK (
  user_belongs_to_organization(auth.uid(), organization_id)
);
