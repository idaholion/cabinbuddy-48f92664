ALTER TABLE public.reminder_templates
  ADD COLUMN IF NOT EXISTS trigger_event text NOT NULL DEFAULT 'before_start';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'reminder_templates_trigger_event_check'
  ) THEN
    ALTER TABLE public.reminder_templates
      ADD CONSTRAINT reminder_templates_trigger_event_check
      CHECK (trigger_event IN ('before_start','before_end','manual'));
  END IF;
END $$;