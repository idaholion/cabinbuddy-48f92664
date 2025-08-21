-- Update existing proposals to use proper display names instead of email usernames
UPDATE voting_proposals 
SET created_by_name = 'Richard Andrew'
WHERE created_by_name = 'rvandrew' 
  AND organization_id = 'f8882cbd-fc37-4521-bfd2-992dc8eb9a9f';