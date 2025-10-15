-- Fix RLS policy - the column reference was ambiguous and matched wrong column
-- Need to explicitly reference NEW row values in INSERT WITH CHECK

DROP POLICY IF EXISTS "Users can create payments in their organization" ON payments;

CREATE POLICY "Users can create payments in their organization"
ON payments
FOR INSERT
TO authenticated
WITH CHECK (
  -- User must be authenticated
  auth.uid() IS NOT NULL
  AND
  -- User must be a member of the target organization
  -- In INSERT context, unqualified column names refer to the NEW row being inserted
  EXISTS (
    SELECT 1 
    FROM user_organizations uo
    WHERE uo.user_id = auth.uid() 
    AND uo.organization_id = payments.organization_id
  )
  AND
  -- If family_group is specified, it must exist in the organization
  (
    payments.family_group IS NULL 
    OR 
    family_group_exists_in_org(payments.organization_id, payments.family_group)
  )
);