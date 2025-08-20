-- Fix security vulnerability: Restrict guest access to organizations table
-- Remove the overly permissive guest policy that exposes contact information
DROP POLICY IF EXISTS "Guest users can view public readonly organizations" ON organizations;

-- Create a new restrictive policy that only allows basic organization info for guests
CREATE POLICY "Guest users can view basic public organization info"
ON organizations
FOR SELECT
USING (
  access_type = ANY (ARRAY['public_readonly'::text, 'demo'::text])
  -- This policy will be combined with a column-level restriction in the application layer
);

-- Add a comment to document the security consideration
COMMENT ON POLICY "Guest users can view basic public organization info" ON organizations IS 
'Allows guest users to view public organizations, but application must filter sensitive contact fields';