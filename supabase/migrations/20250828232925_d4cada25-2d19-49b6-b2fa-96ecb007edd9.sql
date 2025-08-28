-- Simply add Epsilon Epsilon to user_organizations 
-- This table should not have the same RLS validation restrictions
INSERT INTO user_organizations (user_id, organization_id, role, is_primary, joined_at)
SELECT 
  u.id,
  'c786936c-6167-451d-9473-1f0ba22d5cfd'::uuid,
  'member',
  true,
  now()
FROM auth.users u
WHERE u.email = 'epsilon@alpha.org'
AND NOT EXISTS (
  SELECT 1 FROM user_organizations uo 
  WHERE uo.user_id = u.id
);