-- Drop the existing restrictive INSERT policy
DROP POLICY IF EXISTS "Users can create payments with proper authorization" ON public.payments;

-- Create a more permissive policy that allows users to create payments for any family group in their organization
CREATE POLICY "Users can create payments in their organization" 
ON public.payments 
FOR INSERT 
WITH CHECK (
  -- User must be in the organization
  EXISTS (
    SELECT 1 FROM public.user_organizations 
    WHERE user_id = auth.uid() 
    AND organization_id = payments.organization_id
  )
  AND (
    -- User must be the creator
    created_by_user_id = auth.uid()
    -- OR user is an admin
    OR is_organization_admin()
    -- OR user is the lead of the family group
    OR EXISTS (
      SELECT 1 FROM public.family_groups
      WHERE organization_id = payments.organization_id
      AND name = payments.family_group
      AND (lead_email = get_current_user_email() OR alternate_lead_id = get_current_user_email())
    )
  )
);