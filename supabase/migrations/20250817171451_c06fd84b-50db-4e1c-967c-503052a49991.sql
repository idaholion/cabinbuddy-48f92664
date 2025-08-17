-- Step 1: Clean up duplicate family groups first
WITH ranked_groups AS (
  SELECT 
    id,
    name,
    organization_id,
    lead_name,
    host_members,
    created_at,
    updated_at,
    ROW_NUMBER() OVER (
      PARTITION BY organization_id, name 
      ORDER BY 
        CASE 
          WHEN lead_name IS NOT NULL THEN 1 
          WHEN host_members IS NOT NULL AND jsonb_array_length(host_members) > 0 THEN 2
          ELSE 3 
        END,
        updated_at DESC,
        created_at DESC
    ) as rn
  FROM family_groups
),
groups_to_delete AS (
  SELECT id FROM ranked_groups WHERE rn > 1
)
-- Delete duplicate family groups (keeping the best one)
DELETE FROM family_groups 
WHERE id IN (SELECT id FROM groups_to_delete);