ALTER TABLE public.reminder_templates
ADD COLUMN IF NOT EXISTS delivery_method text NOT NULL DEFAULT 'email';

ALTER TABLE public.reminder_templates
DROP CONSTRAINT IF EXISTS reminder_templates_delivery_method_check;

ALTER TABLE public.reminder_templates
ADD CONSTRAINT reminder_templates_delivery_method_check
CHECK (delivery_method IN ('email','sms','both'));

UPDATE public.reminder_templates
SET delivery_method = 'both'
WHERE sms_message_template IS NOT NULL AND btrim(sms_message_template) <> '';