-- Trim trailing spaces from member_profile_links.member_name
UPDATE member_profile_links 
SET member_name = TRIM(member_name),
    updated_at = NOW()
WHERE member_name != TRIM(member_name);

-- Trim trailing spaces from family_groups.lead_name
UPDATE family_groups 
SET lead_name = TRIM(lead_name),
    updated_at = NOW()
WHERE lead_name IS NOT NULL AND lead_name != TRIM(lead_name);

-- Trim trailing spaces from host_members names in family_groups
UPDATE family_groups 
SET host_members = (
  SELECT jsonb_agg(
    CASE 
      WHEN jsonb_typeof(member) = 'object' AND member ? 'name' 
      THEN jsonb_set(member, '{name}', to_jsonb(TRIM(member->>'name')))
      ELSE member
    END
  )
  FROM jsonb_array_elements(COALESCE(host_members, '[]'::jsonb)) AS member
),
updated_at = NOW()
WHERE host_members IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM jsonb_array_elements(host_members) AS member
    WHERE member ? 'name' AND member->>'name' != TRIM(member->>'name')
  );