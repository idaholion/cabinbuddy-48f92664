-- Add financial settings columns to reservation_settings table
ALTER TABLE public.reservation_settings 
ADD COLUMN IF NOT EXISTS preferred_payment_method TEXT,
ADD COLUMN IF NOT EXISTS payment_terms TEXT,
ADD COLUMN IF NOT EXISTS auto_invoicing BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS late_fees_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS late_fee_amount NUMERIC,
ADD COLUMN IF NOT EXISTS late_fee_grace_days INTEGER,
ADD COLUMN IF NOT EXISTS cancellation_policy TEXT,
ADD COLUMN IF NOT EXISTS tax_rate NUMERIC,
ADD COLUMN IF NOT EXISTS tax_id TEXT,
ADD COLUMN IF NOT EXISTS tax_jurisdiction TEXT,
ADD COLUMN IF NOT EXISTS billing_frequency TEXT DEFAULT 'per-stay';