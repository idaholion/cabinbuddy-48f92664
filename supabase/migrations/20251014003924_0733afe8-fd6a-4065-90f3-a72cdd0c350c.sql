
-- Fix RLS policy to check organization membership directly instead of using get_user_organization_id()
DROP POLICY IF EXISTS "Users can create payments with proper authorization" ON public.payments;

CREATE POLICY "Users can create payments with proper authorization" 
ON public.payments 
FOR INSERT 
WITH CHECK (
  -- User must be a member of the organization they're creating payments in
  EXISTS (
    SELECT 1 FROM user_organizations
    WHERE user_organizations.user_id = auth.uid()
      AND user_organizations.organization_id = payments.organization_id
  )
  AND (
    -- Organization admins can create any payment
    is_organization_admin()
    OR
    -- Family group leads can create payments for their own group
    (
      EXISTS (
        SELECT 1 FROM family_groups
        WHERE family_groups.organization_id = payments.organization_id
          AND family_groups.name = payments.family_group
          AND (
            family_groups.lead_email = get_current_user_email()
            OR family_groups.alternate_lead_id = get_current_user_email()
          )
      )
    )
    OR
    -- Any authenticated user can create payments as long as they're marked as creator
    -- This enables cost splitting where users create payments for other family groups
    (auth.uid() IS NOT NULL AND created_by_user_id = auth.uid())
  )
);
