-- Clean up all test data but preserve supervisor account rvandrew@outlook.com
-- First clean up all application tables again
DELETE FROM trade_notifications;
DELETE FROM trade_requests;
DELETE FROM work_weekend_approvals;
DELETE FROM work_weekends;
DELETE FROM calendar_keeper_requests;
DELETE FROM time_period_usage;
DELETE FROM secondary_selection_status;
DELETE FROM reservation_periods;
DELETE FROM checkin_sessions;
DELETE FROM survey_responses;
DELETE FROM receipts;
DELETE FROM reservations;
DELETE FROM recurring_bills;
DELETE FROM custom_checklists;
DELETE FROM reservation_settings;
DELETE FROM rotation_orders;
DELETE FROM notification_log;
DELETE FROM family_groups;
DELETE FROM user_organizations;
DELETE FROM profiles;
DELETE FROM organizations;
DELETE FROM bulk_operation_audit;
DELETE FROM organization_access_audit;

-- Now clean up auth.users table but preserve supervisor account
DELETE FROM auth.users 
WHERE email != 'rvandrew@outlook.com';

-- Ensure supervisor entry exists and is active
INSERT INTO public.supervisors (email, name, is_active)
VALUES ('rvandrew@outlook.com', 'RV Andrew', true)
ON CONFLICT (email) DO UPDATE SET
  is_active = true,
  updated_at = now();