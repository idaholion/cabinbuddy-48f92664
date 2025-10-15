-- Drop the current policy
DROP POLICY IF EXISTS "Users can create payments in their organization" ON public.payments;

-- Create a simpler, more permissive policy for inserts
CREATE POLICY "Users can create payments in their organization" 
ON public.payments 
FOR INSERT 
WITH CHECK (
  -- User must be authenticated and in the organization
  auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.user_organizations 
    WHERE user_id = auth.uid() 
    AND organization_id = payments.organization_id
  )
  AND (
    -- If they're the creator, they can create for any family group in their org
    created_by_user_id = auth.uid()
    -- OR if they're an admin, they can create anything
    OR is_organization_admin()
  )
);