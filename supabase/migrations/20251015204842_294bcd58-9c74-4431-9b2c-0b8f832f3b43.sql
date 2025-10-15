
-- Fix the INSERT policy - check for NULL FIRST before calling function
DROP POLICY IF EXISTS "Users can create payments in their organization" ON public.payments;

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
  -- CRITICAL: Check NULL first to short-circuit before function call
  (
    family_group IS NULL
    OR
    (family_group IS NOT NULL AND public.family_group_exists_in_org(organization_id, family_group))
  )
);
