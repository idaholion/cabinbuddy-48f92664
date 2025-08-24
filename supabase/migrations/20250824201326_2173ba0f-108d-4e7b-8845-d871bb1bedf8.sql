-- Add missing columns to reminder_templates table
ALTER TABLE public.reminder_templates 
ADD COLUMN IF NOT EXISTS days_in_advance integer DEFAULT NULL;

ALTER TABLE public.reminder_templates 
ADD COLUMN IF NOT EXISTS created_by_user_id uuid DEFAULT NULL;