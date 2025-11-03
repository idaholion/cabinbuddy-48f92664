-- Reschedule notification cron jobs from 3 AM MST to 8 AM MST
-- Previous schedule: 9-11 AM UTC (2-4 AM MST)
-- New schedule: 3 PM UTC (8 AM MST)

-- Unschedule existing cron jobs
SELECT cron.unschedule('selection-period-notifications');
SELECT cron.unschedule('reminder-notifications');
SELECT cron.unschedule('work-weekend-notifications');
SELECT cron.unschedule('daily-reminder-notifications');

-- Schedule selection period notifications at 3:00 PM UTC (8:00 AM MST)
SELECT cron.schedule(
  'selection-period-notifications',
  '0 15 * * *',
  $$
  SELECT net.http_post(
    url := 'https://ftaxzdnrnhktzbcsejoy.supabase.co/functions/v1/check-selection-turn-changes',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ0YXh6ZG5ybmhrdHpiY3Nlam95Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk2NTM5NTcsImV4cCI6MjA1NTIyOTk1N30.qPWxWABhU74s-ZMc8hbeFWiM0a1_tENPtV3gCJHxUGQ"}'::jsonb
  ) as request_id;
  $$
);

-- Schedule reminder notifications at 3:05 PM UTC (8:05 AM MST) - staggered 5 minutes
SELECT cron.schedule(
  'reminder-notifications',
  '5 15 * * *',
  $$
  SELECT net.http_post(
    url := 'https://ftaxzdnrnhktzbcsejoy.supabase.co/functions/v1/send-reminder-notifications',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ0YXh6ZG5ybmhrdHpiY3Nlam95Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk2NTM5NTcsImV4cCI6MjA1NTIyOTk1N30.qPWxWABhU74s-ZMc8hbeFWiM0a1_tENPtV3gCJHxUGQ"}'::jsonb
  ) as request_id;
  $$
);

-- Schedule work weekend notifications at 3:10 PM UTC (8:10 AM MST) - staggered 10 minutes
SELECT cron.schedule(
  'work-weekend-notifications',
  '10 15 * * *',
  $$
  SELECT net.http_post(
    url := 'https://ftaxzdnrnhktzbcsejoy.supabase.co/functions/v1/send-work-weekend-notifications',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ0YXh6ZG5ybmhrdHpiY3Nlam95Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk2NTM5NTcsImV4cCI6MjA1NTIyOTk1N30.qPWxWABhU74s-ZMc8hbeFWiM0a1_tENPtV3gCJHxUGQ"}'::jsonb
  ) as request_id;
  $$
);