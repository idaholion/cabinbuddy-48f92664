-- Add new columns to notification_log table for better tracking
ALTER TABLE notification_log
ADD COLUMN IF NOT EXISTS recipient_email TEXT,
ADD COLUMN IF NOT EXISTS recipient_phone TEXT,
ADD COLUMN IF NOT EXISTS email_status TEXT,
ADD COLUMN IF NOT EXISTS sms_status TEXT,
ADD COLUMN IF NOT EXISTS sms_error TEXT,
ADD COLUMN IF NOT EXISTS twilio_sid TEXT;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_notification_log_sent_at 
ON notification_log(organization_id, sent_at DESC);

CREATE INDEX IF NOT EXISTS idx_notification_log_family_group 
ON notification_log(organization_id, family_group);
