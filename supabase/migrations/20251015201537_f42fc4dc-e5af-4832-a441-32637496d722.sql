-- Fix RLS policy - in INSERT WITH CHECK, column references don't need table prefix
-- The NEW row's columns are directly accessible by name
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
    AND uo.organization_id = organization_id  -- This references the NEW row's organization_id column directly
  )
);