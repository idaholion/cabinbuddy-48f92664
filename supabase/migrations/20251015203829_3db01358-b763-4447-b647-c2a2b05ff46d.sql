
-- Drop the existing INSERT policy
DROP POLICY IF EXISTS "Users can create payments in their organization" ON public.payments;

-- Create new INSERT policy that allows creating payments for any family group in the user's organization
CREATE POLICY "Users can create payments in their organization"
ON public.payments
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
  AND
  organization_id IN (
    SELECT uo.organization_id
    FROM user_organizations uo
    WHERE uo.user_id = auth.uid()
  )
  AND
  -- Ensure the family_group exists in the same organization
  (
    family_group IN (
      SELECT fg.name
      FROM family_groups fg
      WHERE fg.organization_id = payments.organization_id
    )
    OR family_group IS NULL
  )
);
