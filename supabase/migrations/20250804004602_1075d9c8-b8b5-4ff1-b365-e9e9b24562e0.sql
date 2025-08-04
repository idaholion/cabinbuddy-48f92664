-- Enable pg_cron extension for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable pg_net extension for HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule weekly backups to run every Sunday at 2 AM UTC
SELECT cron.schedule(
  'weekly-organization-backups',
  '0 2 * * 0',  -- Every Sunday at 2 AM UTC
  $$
  SELECT
    net.http_post(
        url:='https://ftaxzdnrnhktzbcsejoy.supabase.co/functions/v1/create-organization-backup',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ0YXh6ZG5ybmhrdHpiY3Nlam95Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzQ1ODA0MywiZXhwIjoyMDY5MDM0MDQzfQ.qv8YgNDxiXk8YeqE23Z6EAG0iEGcaqZJrfLDrJrS8OY"}'::jsonb,
        body:='{"backup_type": "scheduled"}'::jsonb
    ) as request_id;
  $$
);