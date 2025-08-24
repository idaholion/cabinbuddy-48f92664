-- Add missing is_active column to reminder_templates table
ALTER TABLE public.reminder_templates 
ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;