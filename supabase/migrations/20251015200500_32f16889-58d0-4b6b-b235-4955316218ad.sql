
-- Fix RLS policy for payments to properly support split cost operations
-- The issue is that the policy needs to check organization membership via user_organizations
-- instead of relying on get_user_organization_id() which depends on primary org

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
    AND uo.organization_id = payments.organization_id
  )
);
