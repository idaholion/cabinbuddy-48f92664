-- Fix payment_splits RLS policy to work with multi-organization access
-- The issue: get_user_organization_id() only returns PRIMARY organization,
-- but users can create splits in any organization they're a member of

-- Drop the restrictive INSERT policy
DROP POLICY IF EXISTS "Users can create splits" ON payment_splits;

-- Create new INSERT policy that checks organization membership instead of just primary org
CREATE POLICY "Users can create splits in their organizations"
  ON payment_splits FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_organizations 
      WHERE user_id = auth.uid() 
      AND organization_id = payment_splits.organization_id
    )
    AND created_by_user_id = auth.uid()
  );

-- Also update the SELECT policy to allow viewing splits from all user's organizations
DROP POLICY IF EXISTS "Users can view their organization's splits" ON payment_splits;

CREATE POLICY "Users can view splits in their organizations"
  ON payment_splits FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_organizations 
      WHERE user_id = auth.uid() 
      AND organization_id = payment_splits.organization_id
    )
  );

-- Update the UPDATE policy similarly
DROP POLICY IF EXISTS "Users can update their splits" ON payment_splits;

CREATE POLICY "Users can update their splits in their organizations"
  ON payment_splits FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_organizations 
      WHERE user_id = auth.uid() 
      AND organization_id = payment_splits.organization_id
    )
    AND created_by_user_id = auth.uid()
  );