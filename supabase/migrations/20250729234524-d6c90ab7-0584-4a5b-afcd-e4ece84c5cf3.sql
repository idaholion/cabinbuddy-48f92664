-- Clear all related data that might appear on the calendar
DELETE FROM time_period_usage;
DELETE FROM reservation_periods;
DELETE FROM trade_requests;
DELETE FROM trade_notifications;
DELETE FROM notification_log;