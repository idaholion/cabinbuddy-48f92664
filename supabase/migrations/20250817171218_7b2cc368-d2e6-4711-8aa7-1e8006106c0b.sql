-- Clean up duplicate family groups by keeping the most recent one with data
-- and removing empty duplicates

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
-- First, update references in other tables to point to the kept records
UPDATE reservations 
SET family_group = (
  SELECT fg.name 
  FROM family_groups fg 
  JOIN ranked_groups rg ON fg.id = rg.id 
  WHERE rg.organization_id = reservations.organization_id 
    AND rg.name = reservations.family_group 
    AND rg.rn = 1
  LIMIT 1
)
WHERE EXISTS (
  SELECT 1 FROM groups_to_delete gtd 
  JOIN family_groups fg ON gtd.id = fg.id 
  WHERE fg.name = reservations.family_group 
    AND fg.organization_id = reservations.organization_id
);

-- Update other table references
UPDATE receipts 
SET family_group = (
  SELECT fg.name 
  FROM family_groups fg 
  JOIN ranked_groups rg ON fg.id = rg.id 
  WHERE rg.organization_id = receipts.organization_id 
    AND rg.name = receipts.family_group 
    AND rg.rn = 1
  LIMIT 1
)
WHERE EXISTS (
  SELECT 1 FROM groups_to_delete gtd 
  JOIN family_groups fg ON gtd.id = fg.id 
  WHERE fg.name = receipts.family_group 
    AND fg.organization_id = receipts.organization_id
);

-- Update family_group_shares
UPDATE family_group_shares 
SET family_group_name = (
  SELECT fg.name 
  FROM family_groups fg 
  JOIN ranked_groups rg ON fg.id = rg.id 
  WHERE rg.organization_id = family_group_shares.organization_id 
    AND rg.name = family_group_shares.family_group_name 
    AND rg.rn = 1
  LIMIT 1
)
WHERE EXISTS (
  SELECT 1 FROM groups_to_delete gtd 
  JOIN family_groups fg ON gtd.id = fg.id 
  WHERE fg.name = family_group_shares.family_group_name 
    AND fg.organization_id = family_group_shares.organization_id
);

-- Update member_share_allocations
UPDATE member_share_allocations 
SET family_group_name = (
  SELECT fg.name 
  FROM family_groups fg 
  JOIN ranked_groups rg ON fg.id = rg.id 
  WHERE rg.organization_id = member_share_allocations.organization_id 
    AND rg.name = member_share_allocations.family_group_name 
    AND rg.rn = 1
  LIMIT 1
)
WHERE EXISTS (
  SELECT 1 FROM groups_to_delete gtd 
  JOIN family_groups fg ON gtd.id = fg.id 
  WHERE fg.name = member_share_allocations.family_group_name 
    AND fg.organization_id = member_share_allocations.organization_id
);

-- Now delete the duplicate family groups
DELETE FROM family_groups 
WHERE id IN (SELECT id FROM groups_to_delete);