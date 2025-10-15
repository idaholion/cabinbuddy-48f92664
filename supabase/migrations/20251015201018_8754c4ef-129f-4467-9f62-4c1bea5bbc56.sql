
-- Fix RLS policy - use direct column reference in WITH CHECK clause
DROP POLICY IF EXISTS "Users can create payments in their organization" ON public.payments;

CREATE POLICY "Users can create payments in their organization" 
ON public.payments 
FOR INSERT 
WITH CHECK (
  -- User must be authenticated
  auth.uid() IS NOT NULL
  AND
  -- User must be a member of the target organization
  EXISTS (
    SELECT 1 FROM user_organizations uo
    WHERE uo.user_id = auth.uid()
    AND uo.organization_id = organization_id  -- Direct column reference, not payments.organization_id
  )
);
