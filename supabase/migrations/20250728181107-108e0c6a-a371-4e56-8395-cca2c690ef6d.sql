-- Add columns to reservations table to track time period allocation vs actual booking dates
ALTER TABLE public.reservations 
ADD COLUMN allocated_start_date date,
ADD COLUMN allocated_end_date date,
ADD COLUMN time_period_number integer,
ADD COLUMN nights_used integer;

-- Add table to track time period usage per family group
CREATE TABLE IF NOT EXISTS public.time_period_usage (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL,
  family_group text NOT NULL,
  rotation_year integer NOT NULL,
  time_periods_used integer NOT NULL DEFAULT 0,
  time_periods_allowed integer NOT NULL DEFAULT 2,
  last_selection_date timestamp with time zone,
  selection_deadline timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(organization_id, family_group, rotation_year)
);

-- Enable RLS on time_period_usage table
ALTER TABLE public.time_period_usage ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for time_period_usage
CREATE POLICY "Users can view their organization's time period usage" 
ON public.time_period_usage 
FOR SELECT 
USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can manage their organization's time period usage" 
ON public.time_period_usage 
FOR ALL 
USING (organization_id = get_user_organization_id());

CREATE POLICY "Supervisors can view all time period usage" 
ON public.time_period_usage 
FOR SELECT 
USING (is_supervisor());

CREATE POLICY "Supervisors can manage all time period usage" 
ON public.time_period_usage 
FOR ALL 
USING (is_supervisor());

-- Create trigger for updated_at
CREATE TRIGGER update_time_period_usage_updated_at
BEFORE UPDATE ON public.time_period_usage
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();