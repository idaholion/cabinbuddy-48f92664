-- Add automated reminders setting to organizations table
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS automated_reminders_enabled boolean DEFAULT false;