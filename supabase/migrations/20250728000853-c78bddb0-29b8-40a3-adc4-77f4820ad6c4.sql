-- Add selection_days field to rotation_orders table
ALTER TABLE public.rotation_orders 
ADD COLUMN selection_days integer DEFAULT 14;

-- Create reservation_periods table to track active selection periods
CREATE TABLE public.reservation_periods (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  rotation_year integer NOT NULL,
  current_group_index integer NOT NULL,
  current_family_group text NOT NULL,
  selection_start_date date NOT NULL,
  selection_end_date date NOT NULL,
  reservations_completed boolean DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create reservations table to store actual bookings
CREATE TABLE public.reservations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  family_group text NOT NULL,
  user_id UUID,
  property_name text,
  start_date date NOT NULL,
  end_date date NOT NULL,
  guest_count integer,
  total_cost numeric,
  status text DEFAULT 'confirmed',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create notification_log table to track sent notifications
CREATE TABLE public.notification_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  family_group text NOT NULL,
  notification_type text NOT NULL, -- 'advance', 'day_of', 'halfway', 'final'
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  email_sent boolean DEFAULT false,
  sms_sent boolean DEFAULT false,
  reservation_period_id UUID
);

-- Enable RLS on new tables
ALTER TABLE public.reservation_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_log ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for reservation_periods
CREATE POLICY "Users can view their organization's reservation periods" 
ON public.reservation_periods 
FOR SELECT 
USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can manage their organization's reservation periods" 
ON public.reservation_periods 
FOR ALL 
USING (organization_id = get_user_organization_id());

CREATE POLICY "Supervisors can view all reservation periods" 
ON public.reservation_periods 
FOR SELECT 
USING (is_supervisor());

CREATE POLICY "Supervisors can manage all reservation periods" 
ON public.reservation_periods 
FOR ALL 
USING (is_supervisor());

-- Create RLS policies for reservations
CREATE POLICY "Users can view their organization's reservations" 
ON public.reservations 
FOR SELECT 
USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can manage their organization's reservations" 
ON public.reservations 
FOR ALL 
USING (organization_id = get_user_organization_id());

CREATE POLICY "Supervisors can view all reservations" 
ON public.reservations 
FOR SELECT 
USING (is_supervisor());

CREATE POLICY "Supervisors can manage all reservations" 
ON public.reservations 
FOR ALL 
USING (is_supervisor());

-- Create RLS policies for notification_log
CREATE POLICY "Users can view their organization's notification log" 
ON public.notification_log 
FOR SELECT 
USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can manage their organization's notification log" 
ON public.notification_log 
FOR ALL 
USING (organization_id = get_user_organization_id());

CREATE POLICY "Supervisors can view all notification logs" 
ON public.notification_log 
FOR SELECT 
USING (is_supervisor());

CREATE POLICY "Supervisors can manage all notification logs" 
ON public.notification_log 
FOR ALL 
USING (is_supervisor());

-- Create triggers for updated_at columns
CREATE TRIGGER update_reservation_periods_updated_at
BEFORE UPDATE ON public.reservation_periods
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_reservations_updated_at
BEFORE UPDATE ON public.reservations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();