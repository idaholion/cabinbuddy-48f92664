-- Drop the existing restrictive INSERT policy
DROP POLICY IF EXISTS "Admins can create payments" ON public.payments;

-- Create new INSERT policy that allows:
-- 1. Organization admins to create any payment
-- 2. Family group leads to create payments for their own group
-- 3. Any authenticated user to create payments where they are the creator (enables cost splitting)
CREATE POLICY "Users can create payments with proper authorization" 
ON public.payments 
FOR INSERT 
WITH CHECK (
  organization_id = get_user_organization_id() 
  AND (
    -- Organization admins can create any payment
    is_organization_admin()
    OR
    -- Family group leads can create payments for their own group
    (
      EXISTS (
        SELECT 1 FROM family_groups
        WHERE family_groups.organization_id = get_user_organization_id()
          AND family_groups.name = payments.family_group
          AND (
            family_groups.lead_email = get_current_user_email()
            OR family_groups.alternate_lead_id = get_current_user_email()
          )
      )
    )
    OR
    -- Any user can create payments where they are the creator (enables cost splitting)
    (created_by_user_id = auth.uid())
  )
);