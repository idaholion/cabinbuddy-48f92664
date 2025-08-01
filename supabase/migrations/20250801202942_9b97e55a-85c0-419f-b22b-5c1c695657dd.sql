-- Delete all test1 user data completely
-- First delete from profiles table (this will cascade to other relationships)
DELETE FROM profiles WHERE user_id = '6ead905d-ce8b-4911-afa3-38b7ef61dd07';

-- Delete from any remaining organization-related tables
DELETE FROM user_organizations WHERE user_id = '6ead905d-ce8b-4911-afa3-38b7ef61dd07';

-- Delete any remaining organization data that might be associated with test1
DELETE FROM organizations WHERE admin_email = 'test1@test1.com' OR treasurer_email = 'test1@test1.com' OR calendar_keeper_email = 'test1@test1.com';
DELETE FROM family_groups WHERE organization_id IN (SELECT id FROM organizations WHERE name ILIKE '%test%');
DELETE FROM reservation_settings WHERE organization_id IN (SELECT id FROM organizations WHERE name ILIKE '%test%');
DELETE FROM rotation_orders WHERE organization_id IN (SELECT id FROM organizations WHERE name ILIKE '%test%');
DELETE FROM reservations WHERE organization_id IN (SELECT id FROM organizations WHERE name ILIKE '%test%');
DELETE FROM receipts WHERE organization_id IN (SELECT id FROM organizations WHERE name ILIKE '%test%');

-- Finally delete the auth user record (this is the main one)
DELETE FROM auth.users WHERE email = 'test1@test1.com';