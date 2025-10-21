-- Add SMS message template field to reminder_templates table
ALTER TABLE public.reminder_templates 
ADD COLUMN IF NOT EXISTS sms_message_template text;

-- Add comment explaining the column
COMMENT ON COLUMN public.reminder_templates.sms_message_template IS 'Custom SMS message template (max 160 chars for single SMS, 480 for multi-part). Supports variables like {{guest_name}}, {{family_group_name}}, etc.';