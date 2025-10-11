-- Add invoice automation settings columns to reservation_settings table
ALTER TABLE reservation_settings 
ADD COLUMN IF NOT EXISTS invoice_email_subject text,
ADD COLUMN IF NOT EXISTS invoice_email_body text,
ADD COLUMN IF NOT EXISTS reminder_email_subject text,
ADD COLUMN IF NOT EXISTS reminder_email_body text,
ADD COLUMN IF NOT EXISTS reminder_7_days_enabled boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS reminder_3_days_enabled boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS reminder_1_day_enabled boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS reminder_due_date_enabled boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS overdue_reminder_interval_days integer DEFAULT 7,
ADD COLUMN IF NOT EXISTS email_delivery_enabled boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS sms_delivery_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS batch_send_enabled boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS invoice_approval_required boolean DEFAULT false;

-- Add comments for documentation
COMMENT ON COLUMN reservation_settings.invoice_email_subject IS 'Email subject line template for invoices. Supports variables: {invoice_number}, {organization_name}, {family_group}, {total_amount}, {due_date}';
COMMENT ON COLUMN reservation_settings.invoice_email_body IS 'Email body template for invoices. Supports variables: {invoice_number}, {organization_name}, {family_group}, {total_amount}, {due_date}';
COMMENT ON COLUMN reservation_settings.reminder_email_subject IS 'Email subject line template for payment reminders';
COMMENT ON COLUMN reservation_settings.reminder_email_body IS 'Email body template for payment reminders';
COMMENT ON COLUMN reservation_settings.reminder_7_days_enabled IS 'Send reminder 7 days before due date';
COMMENT ON COLUMN reservation_settings.reminder_3_days_enabled IS 'Send reminder 3 days before due date';
COMMENT ON COLUMN reservation_settings.reminder_1_day_enabled IS 'Send reminder 1 day before due date';
COMMENT ON COLUMN reservation_settings.reminder_due_date_enabled IS 'Send reminder on due date';
COMMENT ON COLUMN reservation_settings.overdue_reminder_interval_days IS 'How often (in days) to send reminders for overdue invoices';
COMMENT ON COLUMN reservation_settings.email_delivery_enabled IS 'Enable email delivery for invoices and reminders';
COMMENT ON COLUMN reservation_settings.sms_delivery_enabled IS 'Enable SMS delivery for invoice notifications';
COMMENT ON COLUMN reservation_settings.batch_send_enabled IS 'Allow sending invoices in batches';
COMMENT ON COLUMN reservation_settings.invoice_approval_required IS 'Require admin approval before sending invoices';