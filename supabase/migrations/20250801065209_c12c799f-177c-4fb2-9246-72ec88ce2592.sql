-- Add payment account information columns to reservation_settings table
ALTER TABLE public.reservation_settings 
ADD COLUMN IF NOT EXISTS venmo_handle TEXT,
ADD COLUMN IF NOT EXISTS paypal_email TEXT,
ADD COLUMN IF NOT EXISTS check_payable_to TEXT,
ADD COLUMN IF NOT EXISTS check_mailing_address TEXT;