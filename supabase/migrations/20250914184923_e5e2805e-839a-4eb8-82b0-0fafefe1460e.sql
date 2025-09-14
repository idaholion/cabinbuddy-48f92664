-- Manually fix the primary organization issues for the current user
-- First, set all other users in Andrew Family Cabin to is_primary = false except the admin
UPDATE user_organizations 
SET is_primary = false 
WHERE organization_id = 'f8882cbd-fc37-4521-bfd2-992dc8eb9a9f' 
  AND user_id != 'df76de07-61a3-424d-a19f-adf56c0d940d' 
  AND is_primary = true;

-- Ensure the admin user has is_primary = true for Andrew Family Cabin
UPDATE user_organizations 
SET is_primary = true 
WHERE organization_id = 'f8882cbd-fc37-4521-bfd2-992dc8eb9a9f' 
  AND user_id = 'df76de07-61a3-424d-a19f-adf56c0d940d';

-- Fix any other users who might not have a primary organization
-- For each user who has no primary organization, set their first organization as primary
WITH users_without_primary AS (
  SELECT user_id 
  FROM user_organizations 
  GROUP BY user_id 
  HAVING COUNT(CASE WHEN is_primary = true THEN 1 END) = 0
),
first_org_per_user AS (
  SELECT DISTINCT ON (uo.user_id) uo.user_id, uo.organization_id
  FROM user_organizations uo
  JOIN users_without_primary uwp ON uo.user_id = uwp.user_id
  ORDER BY uo.user_id, uo.joined_at ASC
)
UPDATE user_organizations 
SET is_primary = true 
FROM first_org_per_user fop
WHERE user_organizations.user_id = fop.user_id 
  AND user_organizations.organization_id = fop.organization_id;