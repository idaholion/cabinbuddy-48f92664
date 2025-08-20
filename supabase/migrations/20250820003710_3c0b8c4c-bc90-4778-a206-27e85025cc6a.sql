-- Fix missing user-organization relationship for Richard Andrew
-- This creates the proper link between the user and their organization

INSERT INTO user_organizations (
  user_id,
  organization_id,
  role,
  is_primary,
  joined_at
) VALUES (
  auth.uid(),
  'f8882cbd-fc37-4521-bfd2-992dc8eb9a9f',
  'admin',
  true,
  now()
) ON CONFLICT (user_id, organization_id) DO UPDATE SET
  role = 'admin',
  is_primary = true,
  updated_at = now();