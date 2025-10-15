-- Fix RLS policy - in WITH CHECK, NEW row columns are referenced without table prefix
DROP POLICY IF EXISTS "Users can create payments in their organization" ON public.payments;

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
);