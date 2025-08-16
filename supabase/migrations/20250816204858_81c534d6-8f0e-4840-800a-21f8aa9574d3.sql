-- Add new fields to recurring_bills table for enhanced bill tracking
ALTER TABLE public.recurring_bills 
ADD COLUMN provider_name text,
ADD COLUMN hibernation_start_date date,
ADD COLUMN hibernation_end_date date,
ADD COLUMN historical_values jsonb DEFAULT '[]'::jsonb,
ADD COLUMN historical_tracking_type text DEFAULT 'monthly';

-- Add helpful comment
COMMENT ON COLUMN public.recurring_bills.provider_name IS 'Name of the company providing the service (e.g., Rocky Mountain Power)';
COMMENT ON COLUMN public.recurring_bills.hibernation_start_date IS 'Start date when bill goes into hibernation/reduced rate period';
COMMENT ON COLUMN public.recurring_bills.hibernation_end_date IS 'End date when bill comes out of hibernation period';
COMMENT ON COLUMN public.recurring_bills.historical_values IS 'Array of historical bill amounts with dates for tracking trends';
COMMENT ON COLUMN public.recurring_bills.historical_tracking_type IS 'Whether historical values are tracked monthly or annually';