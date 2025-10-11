-- Drop existing overly-permissive policies on payments table
DROP POLICY IF EXISTS "Users can view their organization's payments" ON payments;
DROP POLICY IF EXISTS "Users can create payments for their organization" ON payments;
DROP POLICY IF EXISTS "Users can update their organization's payments" ON payments;
DROP POLICY IF EXISTS "Users can delete their organization's payments" ON payments;

-- Create granular SELECT policy for role-based viewing
CREATE POLICY "Role-based payment viewing" ON payments
FOR SELECT USING (
  organization_id = get_user_organization_id() AND (
    -- Admins and treasurers see everything in their org
    is_organization_admin()
    OR
    -- Family group leads see their group's payments
    EXISTS (
      SELECT 1 FROM family_groups 
      WHERE family_groups.organization_id = get_user_organization_id()
        AND family_groups.name = payments.family_group
        AND (family_groups.lead_email = get_current_user_email() 
             OR family_groups.alternate_lead_id = get_current_user_email())
    )
    OR
    -- Regular members see payments linked to their own reservations
    (
      payments.reservation_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM reservations
        WHERE reservations.id = payments.reservation_id
          AND reservations.user_id = auth.uid()
          AND reservations.organization_id = get_user_organization_id()
      )
    )
  )
);

-- Create INSERT policy (admins/treasurers only)
CREATE POLICY "Admins can create payments" ON payments
FOR INSERT WITH CHECK (
  organization_id = get_user_organization_id() 
  AND is_organization_admin()
);

-- Create UPDATE policy (admins/treasurers, family group leads, and members for their own reservations)
CREATE POLICY "Role-based payment updates" ON payments
FOR UPDATE USING (
  organization_id = get_user_organization_id() AND (
    -- Admins and treasurers can update everything
    is_organization_admin()
    OR
    -- Family group leads can update their group's payments
    EXISTS (
      SELECT 1 FROM family_groups 
      WHERE family_groups.organization_id = get_user_organization_id()
        AND family_groups.name = payments.family_group
        AND (family_groups.lead_email = get_current_user_email() 
             OR family_groups.alternate_lead_id = get_current_user_email())
    )
    OR
    -- Regular members can update payments linked to their own reservations
    (
      payments.reservation_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM reservations
        WHERE reservations.id = payments.reservation_id
          AND reservations.user_id = auth.uid()
          AND reservations.organization_id = get_user_organization_id()
      )
    )
  )
);

-- Create DELETE policy (admins/treasurers only)
CREATE POLICY "Admins can delete payments" ON payments
FOR DELETE USING (
  organization_id = get_user_organization_id() 
  AND is_organization_admin()
);