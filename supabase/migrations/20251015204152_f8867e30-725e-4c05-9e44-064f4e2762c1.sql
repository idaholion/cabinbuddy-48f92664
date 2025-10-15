
-- Create a security definer function to validate family group exists in organization
CREATE OR REPLACE FUNCTION public.family_group_exists_in_org(
  p_organization_id uuid,
  p_family_group text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM family_groups
    WHERE organization_id = p_organization_id
      AND name = p_family_group
  );
$$;

-- Drop the existing INSERT policy
DROP POLICY IF EXISTS "Users can create payments in their organization" ON public.payments;

-- Create new INSERT policy using the security definer function
CREATE POLICY "Users can create payments in their organization"
ON public.payments
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
  AND
  -- User must be a member of the organization
  organization_id IN (
    SELECT uo.organization_id
    FROM user_organizations uo
    WHERE uo.user_id = auth.uid()
  )
  AND
  -- Family group must exist in the organization (or be NULL)
  (
    family_group IS NULL
    OR
    public.family_group_exists_in_org(organization_id, family_group)
  )
);
