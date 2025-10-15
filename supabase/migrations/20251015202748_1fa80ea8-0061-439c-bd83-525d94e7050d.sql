
-- The issue is that the WITH CHECK clause references organization_id from the NEW row
-- but the subquery might not be seeing it correctly. Let's make it explicit.

DROP POLICY IF EXISTS "Users can create payments in their organization" ON public.payments;

CREATE POLICY "Users can create payments in their organization" 
ON public.payments 
FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL
  AND
  EXISTS (
    SELECT 1 FROM user_organizations uo
    WHERE uo.user_id = auth.uid()
    AND uo.organization_id = payments.organization_id
  )
);
