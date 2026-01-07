-- Manually link Mallory's profile since she saved but the claim was skipped
INSERT INTO member_profile_links (
  organization_id,
  family_group_name,
  member_name,
  member_type,
  claimed_by_user_id,
  claimed_at
) VALUES (
  'f8882cbd-fc37-4521-bfd2-992dc8eb9a9f',
  'Comeau Family',
  'Mallory Morrill',
  'host_member',
  '6c15cbca-a1c5-4c08-97d7-29a969618937',
  NOW()
)
ON CONFLICT DO NOTHING;