-- Drop ALL existing receipts policies (be thorough)
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'receipts' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.receipts', pol.policyname);
    END LOOP;
END $$;

-- Policy 1: Users can view their own receipts
CREATE POLICY "Users can view their own receipts"
ON receipts
FOR SELECT
USING (
  auth.uid() = user_id
);

-- Policy 2: Family group leads can view their group members' receipts
CREATE POLICY "Family group leads can view group receipts"
ON receipts
FOR SELECT
USING (
  organization_id = get_user_organization_id()
  AND family_group IN (
    SELECT name FROM family_groups
    WHERE organization_id = get_user_organization_id()
    AND (
      lead_email = get_current_user_email()
      OR alternate_lead_id = get_current_user_email()
    )
  )
);

-- Policy 3: Admins and treasurers can view all organization receipts
CREATE POLICY "Admins can view all organization receipts"
ON receipts
FOR SELECT
USING (
  organization_id = get_user_organization_id()
  AND is_organization_admin()
);

-- Policy 4: Supervisors can view all receipts
CREATE POLICY "Supervisors can view all receipts"
ON receipts
FOR SELECT
USING (is_supervisor());

-- Policy 5: Users can create their own receipts
CREATE POLICY "Users can create their own receipts"
ON receipts
FOR INSERT
WITH CHECK (
  organization_id = get_user_organization_id()
  AND user_id = auth.uid()
);

-- Policy 6: Users can update their own receipts
CREATE POLICY "Users can update their own receipts"
ON receipts
FOR UPDATE
USING (
  organization_id = get_user_organization_id()
  AND user_id = auth.uid()
);

-- Policy 7: Users can delete their own receipts
CREATE POLICY "Users can delete their own receipts"
ON receipts
FOR DELETE
USING (
  organization_id = get_user_organization_id()
  AND user_id = auth.uid()
);

-- Policy 8: Admins can manage all organization receipts
CREATE POLICY "Admins can manage all organization receipts"
ON receipts
FOR ALL
USING (
  organization_id = get_user_organization_id()
  AND is_organization_admin()
);

-- Policy 9: Supervisors can manage all receipts
CREATE POLICY "Supervisors can manage all receipts"
ON receipts
FOR ALL
USING (is_supervisor());