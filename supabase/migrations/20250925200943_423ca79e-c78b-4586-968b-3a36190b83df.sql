-- Enable pg_cron extension for scheduling functions
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the selection period notifications to run daily at 9 AM
SELECT cron.schedule(
  'selection-period-notifications',
  '0 9 * * *', -- daily at 9 AM
  $$
  SELECT
    net.http_post(
        url:='https://ftaxzdnrnhktzbcsejoy.supabase.co/functions/v1/send-selection-period-notifications',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ0YXh6ZG5ybmhrdHpiY3Nlam95Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NTgwNDMsImV4cCI6MjA2OTAzNDA0M30.EqvoCt1QJpe3UWFzbhgS_9EUOzoKw-Ze7BnstPBFdNQ"}'::jsonb,
        body:='{"scheduled": true}'::jsonb
    ) as request_id;
  $$
);

-- Schedule the regular reminder notifications to run daily at 10 AM  
SELECT cron.schedule(
  'reminder-notifications',
  '0 10 * * *', -- daily at 10 AM
  $$
  SELECT
    net.http_post(
        url:='https://ftaxzdnrnhktzbcsejoy.supabase.co/functions/v1/send-reminder-notifications',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ0YXh6ZG5ybmhrdHpiY3Nlam95Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NTgwNDMsImV4cCI6MjA2OTAzNDA0M30.EqvoCt1QJpe3UWFzbhgS_9EUOzoKw-Ze7BnstPBFdNQ"}'::jsonb,
        body:='{"scheduled": true}'::jsonb
    ) as request_id;
  $$
);

-- Schedule the work weekend notifications to run daily at 11 AM
SELECT cron.schedule(
  'work-weekend-notifications',
  '0 11 * * *', -- daily at 11 AM
  $$
  SELECT
    net.http_post(
        url:='https://ftaxzdnrnhktzbcsejoy.supabase.co/functions/v1/send-work-weekend-notifications',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ0YXh6ZG5ybmhrdHpiY3Nlam95Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NTgwNDMsImV4cCI6MjA2OTAzNDA0M30.EqvoCt1QJpe3UWFzbhgS_9EUOzoKw-Ze7BnstPBFdNQ"}'::jsonb,
        body:='{"scheduled": true}'::jsonb
    ) as request_id;
  $$
);