
-- Fix the RLS policy - the WITH CHECK was comparing the wrong columns
-- It was checking user_organizations.organization_id = user_organizations.organization_id (always true!)
-- Instead it should check against the NEW row's organization_id value

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
    AND user_organizations.organization_id = payments.organization_id
  )
);
