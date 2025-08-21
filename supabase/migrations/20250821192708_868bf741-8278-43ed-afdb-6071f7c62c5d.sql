-- Add secondary_selection_days column to rotation_orders table
ALTER TABLE public.rotation_orders 
ADD COLUMN secondary_selection_days integer DEFAULT 7;

-- Add comment to describe the new column
COMMENT ON COLUMN public.rotation_orders.secondary_selection_days IS 'Number of days allocated for each family group during secondary selection phase';

-- Update existing records to have the default value
UPDATE public.rotation_orders 
SET secondary_selection_days = 7 
WHERE secondary_selection_days IS NULL;