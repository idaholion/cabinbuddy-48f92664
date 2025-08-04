-- Remove duplicate family groups (keeping the older ones)
-- Delete the newer duplicates based on created_at timestamp

DELETE FROM family_groups 
WHERE id IN (
  'c7ecce7b-10cd-4a31-9b47-d9764ce26fd1',  -- newer Testaa
  '3528f4cc-3ac3-4cf5-8a63-44d52fa3cc4c',  -- newer testbb  
  'e8b1096f-a449-46e0-87d6-362614b568fa'   -- newer Testcc
);

-- Add a unique constraint to prevent future duplicates
ALTER TABLE family_groups 
ADD CONSTRAINT unique_family_group_name_per_org 
UNIQUE (organization_id, name);