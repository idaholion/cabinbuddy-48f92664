-- 1) Reminder day settings (safe to re-run; changes no reservations or turns)
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS selection_setup_first_reminder_days integer NOT NULL DEFAULT 14,
  ADD COLUMN IF NOT EXISTS selection_setup_final_reminder_days integer NOT NULL DEFAULT 2;

-- 2) Run the season setup job every morning at 8:20 AM MST (15:20 UTC)
SELECT cron.unschedule('auto-create-selection-season')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'auto-create-selection-season');

SELECT cron.schedule(
  'auto-create-selection-season',
  '20 15 * * *',
  $$
  SELECT net.http_post(
    url := 'https://ftaxzdnrnhktzbcsejoy.supabase.co/functions/v1/auto-create-selection-season',
    headers := '{"Content-Type": "application/json", "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ0YXh6ZG5ybmhrdHpiY3Nlam95Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NTgwNDMsImV4cCI6MjA2OTAzNDA0M30.EqvoCt1QJpe3UWFzbhgS_9EUOzoKw-Ze7BnstPBFdNQ", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ0YXh6ZG5ybmhrdHpiY3Nlam95Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NTgwNDMsImV4cCI6MjA2OTAzNDA0M30.EqvoCt1QJpe3UWFzbhgS_9EUOzoKw-Ze7BnstPBFdNQ"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
