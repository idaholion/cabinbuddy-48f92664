-- Remove the existing daily backup schedule
SELECT cron.unschedule('daily-organization-backup');

-- Create a new scheduled job to backup all organizations daily at 2 AM Mountain Time (9 AM UTC)
SELECT cron.schedule(
  'daily-organization-backup',
  '0 9 * * *', -- Every day at 9 AM UTC (2 AM MST)
  $$
  SELECT
    net.http_post(
        url:='https://ftaxzdnrnhktzbcsejoy.supabase.co/functions/v1/create-organization-backup',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ0YXh6ZG5ybmhrdHpiY3Nlam95Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NTgwNDMsImV4cCI6MjA2OTAzNDA0M30.EqvoCt1QJpe3UWFzbhgS_9EUOzoKw-Ze7BnstPBFdNQ"}'::jsonb,
        body:='{"backup_type": "scheduled"}'::jsonb
    ) as request_id;
  $$
);