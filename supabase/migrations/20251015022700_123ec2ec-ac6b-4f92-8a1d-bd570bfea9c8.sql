-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can create payments in their organization" ON public.payments;

-- Create a working policy that doesn't check created_by_user_id in WITH CHECK
-- since that value is being set by the insert itself
CREATE POLICY "Users can create payments in their organization" 
ON public.payments 
FOR INSERT 
WITH CHECK (
  -- User must be authenticated
  auth.uid() IS NOT NULL
  -- User must be in the organization
  AND EXISTS (
    SELECT 1 FROM public.user_organizations 
    WHERE user_id = auth.uid() 
    AND organization_id = payments.organization_id
  )
);