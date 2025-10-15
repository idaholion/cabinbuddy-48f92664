-- Fix RLS policy for payments to allow organization members to create guest payments
-- for any family group within their organization

-- Drop existing INSERT policy
DROP POLICY IF EXISTS "Users can create payments in their organization" ON payments;

-- Create new, simplified INSERT policy
-- This allows any authenticated user who is a member of an organization to create
-- payments for ANY family group within that organization (needed for guest cost splits)
CREATE POLICY "Users can create payments in their organization"
ON payments
FOR INSERT
TO authenticated
WITH CHECK (
  -- User must be authenticated
  auth.uid() IS NOT NULL
  AND
  -- User must be a member of the organization
  EXISTS (
    SELECT 1 
    FROM user_organizations 
    WHERE user_id = auth.uid() 
    AND organization_id = payments.organization_id
  )
  AND
  -- If family_group is specified, it must exist in the organization
  (
    family_group IS NULL 
    OR 
    family_group_exists_in_org(payments.organization_id, family_group)
  )
);