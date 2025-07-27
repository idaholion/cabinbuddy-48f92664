-- Update family_groups table to store host_members as JSONB objects with contact info
-- First, let's create a function to convert existing text array to JSONB array
CREATE OR REPLACE FUNCTION convert_host_members_to_jsonb()
RETURNS TRIGGER AS $$
BEGIN
  -- If host_members is not null and is a text array, convert it
  IF OLD.host_members IS NOT NULL THEN
    -- Convert text array to JSONB array of objects
    NEW.host_members := (
      SELECT jsonb_agg(
        jsonb_build_object(
          'name', host_member,
          'phone', '',
          'email', ''
        )
      )
      FROM unnest(OLD.host_members) AS host_member
      WHERE host_member IS NOT NULL AND host_member != ''
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add the new JSONB column for host members
ALTER TABLE public.family_groups 
ADD COLUMN host_members_new JSONB DEFAULT '[]'::jsonb;

-- Migrate existing data from text array to JSONB
UPDATE public.family_groups 
SET host_members_new = COALESCE(
  (
    SELECT jsonb_agg(
      jsonb_build_object(
        'name', host_member,
        'phone', '',
        'email', ''
      )
    )
    FROM unnest(host_members) AS host_member
    WHERE host_member IS NOT NULL AND host_member != ''
  ),
  '[]'::jsonb
)
WHERE host_members IS NOT NULL;

-- Drop the old column and rename the new one
ALTER TABLE public.family_groups DROP COLUMN host_members;
ALTER TABLE public.family_groups RENAME COLUMN host_members_new TO host_members;

-- Clean up the conversion function
DROP FUNCTION convert_host_members_to_jsonb();