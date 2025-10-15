-- Fix RLS policy column references to avoid table self-reference in INSERT
-- Use direct column references (NEW row context) instead of payments.table_name

DROP POLICY IF EXISTS "Users can create payments in their organization" ON payments;

CREATE POLICY "Users can create payments in their organization"
ON payments
FOR INSERT
TO authenticated
WITH CHECK (
  -- User must be authenticated
  auth.uid() IS NOT NULL
  AND
  -- User must be a member of the organization (direct column reference)
  EXISTS (
    SELECT 1 
    FROM user_organizations 
    WHERE user_id = auth.uid() 
    AND user_organizations.organization_id = organization_id
  )
  AND
  -- If family_group is specified, it must exist in the organization (direct column reference)
  (
    family_group IS NULL 
    OR 
    family_group_exists_in_org(organization_id, family_group)
  )
);