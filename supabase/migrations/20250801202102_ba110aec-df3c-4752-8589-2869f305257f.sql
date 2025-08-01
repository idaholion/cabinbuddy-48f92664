-- Delete test1 user data
DELETE FROM family_groups WHERE organization_id = '7bb13268-ddca-4621-91b5-eb3ffb267921';
DELETE FROM reservation_settings WHERE organization_id = '7bb13268-ddca-4621-91b5-eb3ffb267921';
DELETE FROM rotation_orders WHERE organization_id = '7bb13268-ddca-4621-91b5-eb3ffb267921';
DELETE FROM user_organizations WHERE organization_id = '7bb13268-ddca-4621-91b5-eb3ffb267921';
DELETE FROM organizations WHERE id = '7bb13268-ddca-4621-91b5-eb3ffb267921';