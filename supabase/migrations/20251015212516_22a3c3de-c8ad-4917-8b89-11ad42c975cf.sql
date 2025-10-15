-- Temporarily simplify the INSERT policy to isolate the issue
-- Remove the family_group check to see if that's causing the problem

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
);