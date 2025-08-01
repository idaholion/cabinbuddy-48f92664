-- Delete all test1 user data completely
-- First check and delete all related data for the new test1 user ID
DELETE FROM profiles WHERE user_id = '7ed2826f-a86e-415b-8a6d-d55abee92d77';
DELETE FROM user_organizations WHERE user_id = '7ed2826f-a86e-415b-8a6d-d55abee92d77';

-- Delete any organizations associated with test1
DELETE FROM family_groups WHERE organization_id IN (
  SELECT id FROM organizations 
  WHERE admin_email = 'test1@test1.com' 
     OR treasurer_email = 'test1@test1.com' 
     OR calendar_keeper_email = 'test1@test1.com'
);

DELETE FROM reservation_settings WHERE organization_id IN (
  SELECT id FROM organizations 
  WHERE admin_email = 'test1@test1.com' 
     OR treasurer_email = 'test1@test1.com' 
     OR calendar_keeper_email = 'test1@test1.com'
);

DELETE FROM rotation_orders WHERE organization_id IN (
  SELECT id FROM organizations 
  WHERE admin_email = 'test1@test1.com' 
     OR treasurer_email = 'test1@test1.com' 
     OR calendar_keeper_email = 'test1@test1.com'
);

DELETE FROM reservations WHERE organization_id IN (
  SELECT id FROM organizations 
  WHERE admin_email = 'test1@test1.com' 
     OR treasurer_email = 'test1@test1.com' 
     OR calendar_keeper_email = 'test1@test1.com'
);

DELETE FROM receipts WHERE organization_id IN (
  SELECT id FROM organizations 
  WHERE admin_email = 'test1@test1.com' 
     OR treasurer_email = 'test1@test1.com' 
     OR calendar_keeper_email = 'test1@test1.com'
);

-- Delete the organizations
DELETE FROM organizations 
WHERE admin_email = 'test1@test1.com' 
   OR treasurer_email = 'test1@test1.com' 
   OR calendar_keeper_email = 'test1@test1.com';

-- Finally delete the auth user record
DELETE FROM auth.users WHERE email = 'test1@test1.com';