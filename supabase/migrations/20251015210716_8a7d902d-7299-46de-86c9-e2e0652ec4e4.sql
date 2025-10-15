-- Fix RLS policy by removing ALL table qualifiers in WITH CHECK
-- In INSERT policies, column names without table prefix refer to NEW row values

DROP POLICY IF EXISTS "Users can create payments in their organization" ON payments;

CREATE POLICY "Users can create payments in their organization"
ON payments
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM user_organizations 
    WHERE user_organizations.user_id = auth.uid() 
    AND user_organizations.organization_id = organization_id
  )
  AND
  (
    family_group IS NULL 
    OR 
    family_group_exists_in_org(organization_id, family_group)
  )
);