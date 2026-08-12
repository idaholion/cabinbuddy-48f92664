ALTER TABLE public.reservation_settings
  ADD COLUMN IF NOT EXISTS payment_methods_config jsonb;