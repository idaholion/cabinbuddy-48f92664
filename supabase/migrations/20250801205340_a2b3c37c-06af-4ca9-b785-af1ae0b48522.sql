-- Delete family groups for the current user's organization only
DELETE FROM family_groups 
WHERE organization_id = (SELECT get_user_organization_id());