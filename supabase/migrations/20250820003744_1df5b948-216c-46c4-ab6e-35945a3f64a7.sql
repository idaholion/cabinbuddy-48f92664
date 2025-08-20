-- Fix missing user-organization relationship for Richard Andrew
-- Using actual user ID since auth.uid() doesn't work in migrations

INSERT INTO user_organizations (
  user_id,
  organization_id,
  role,
  is_primary,
  joined_at
) VALUES (
  'df76de07-61a3-424d-a19f-adf56c0d940d',
  'f8882cbd-fc37-4521-bfd2-992dc8eb9a9f',
  'admin',
  true,
  now()
) ON CONFLICT (user_id, organization_id) DO UPDATE SET
  role = 'admin',
  is_primary = true,
  updated_at = now();