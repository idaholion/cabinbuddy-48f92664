-- Enable required extensions for CRON jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create CRON job to run reminder notifications daily at 9 AM UTC
SELECT cron.schedule(
  'daily-reminder-notifications',
  '0 9 * * *', -- Daily at 9:00 AM UTC
  $$
  SELECT
    net.http_post(
        url:='https://ftaxzdnrnhktzbcsejoy.supabase.co/functions/v1/send-reminder-notifications',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ0YXh6ZG5ybmhrdHpiY3Nlam95Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NTgwNDMsImV4cCI6MjA2OTAzNDA0M30.EqvoCt1QJpe3UWFzbhgS_9EUOzoKw-Ze7BnstPBFdNQ"}'::jsonb,
        body:='{"scheduled": true}'::jsonb
    ) as request_id;
  $$
);