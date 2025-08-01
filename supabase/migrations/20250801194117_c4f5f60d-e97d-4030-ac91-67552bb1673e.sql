-- Clean up all test data from the database
-- This will preserve table structure but remove all user data

-- Delete in order to respect foreign key constraints
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

-- Note: We're preserving the supervisors table as it contains system configuration