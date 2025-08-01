-- Clean up test1 user data but preserve supervisor account rvandrew@outlook.com
-- First clean up all application tables
DELETE FROM trade_notifications WHERE user_id IN (
  SELECT id FROM auth.users WHERE email LIKE '%test1%'
);
DELETE FROM trade_requests WHERE requester_id IN (
  SELECT id FROM auth.users WHERE email LIKE '%test1%'
) OR target_id IN (
  SELECT id FROM auth.users WHERE email LIKE '%test1%'
);
DELETE FROM work_weekend_approvals WHERE user_id IN (
  SELECT id FROM auth.users WHERE email LIKE '%test1%'
);
DELETE FROM work_weekends WHERE user_id IN (
  SELECT id FROM auth.users WHERE email LIKE '%test1%'
);
DELETE FROM calendar_keeper_requests WHERE user_id IN (
  SELECT id FROM auth.users WHERE email LIKE '%test1%'
);
DELETE FROM time_period_usage WHERE user_id IN (
  SELECT id FROM auth.users WHERE email LIKE '%test1%'
);
DELETE FROM secondary_selection_status WHERE user_id IN (
  SELECT id FROM auth.users WHERE email LIKE '%test1%'
);
DELETE FROM reservation_periods WHERE user_id IN (
  SELECT id FROM auth.users WHERE email LIKE '%test1%'
);
DELETE FROM checkin_sessions WHERE user_id IN (
  SELECT id FROM auth.users WHERE email LIKE '%test1%'
);
DELETE FROM survey_responses WHERE user_id IN (
  SELECT id FROM auth.users WHERE email LIKE '%test1%'
);
DELETE FROM receipts WHERE user_id IN (
  SELECT id FROM auth.users WHERE email LIKE '%test1%'
);
DELETE FROM reservations WHERE user_id IN (
  SELECT id FROM auth.users WHERE email LIKE '%test1%'
);
DELETE FROM recurring_bills WHERE user_id IN (
  SELECT id FROM auth.users WHERE email LIKE '%test1%'
);
DELETE FROM custom_checklists WHERE user_id IN (
  SELECT id FROM auth.users WHERE email LIKE '%test1%'
);
DELETE FROM rotation_orders WHERE user_id IN (
  SELECT id FROM auth.users WHERE email LIKE '%test1%'
);
DELETE FROM notification_log WHERE user_id IN (
  SELECT id FROM auth.users WHERE email LIKE '%test1%'
);
DELETE FROM family_groups WHERE created_by IN (
  SELECT id FROM auth.users WHERE email LIKE '%test1%'
);
DELETE FROM user_organizations WHERE user_id IN (
  SELECT id FROM auth.users WHERE email LIKE '%test1%'
);
DELETE FROM profiles WHERE user_id IN (
  SELECT id FROM auth.users WHERE email LIKE '%test1%'
);
DELETE FROM organizations WHERE admin_email LIKE '%test1%' OR treasurer_email LIKE '%test1%' OR calendar_keeper_email LIKE '%test1%';
DELETE FROM bulk_operation_audit WHERE performed_by IN (
  SELECT id FROM auth.users WHERE email LIKE '%test1%'
);
DELETE FROM organization_access_audit WHERE user_id IN (
  SELECT id FROM auth.users WHERE email LIKE '%test1%'
);

-- Now clean up auth.users table but preserve supervisor account
DELETE FROM auth.users 
WHERE email LIKE '%test1%' AND email != 'rvandrew@outlook.com';

-- Ensure supervisor entry exists and is active
INSERT INTO public.supervisors (email, name, is_active)
VALUES ('rvandrew@outlook.com', 'RV Andrew', true)
ON CONFLICT (email) DO UPDATE SET
  is_active = true,
  updated_at = now();