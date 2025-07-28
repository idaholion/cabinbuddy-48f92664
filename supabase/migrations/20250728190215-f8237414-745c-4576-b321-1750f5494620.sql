-- Create trade requests table
CREATE TABLE public.trade_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  requester_family_group TEXT NOT NULL,
  target_family_group TEXT NOT NULL,
  requested_start_date DATE NOT NULL,
  requested_end_date DATE NOT NULL,
  offered_start_date DATE,
  offered_end_date DATE,
  request_type TEXT NOT NULL CHECK (request_type IN ('request_only', 'trade_offer')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  requester_message TEXT,
  approver_message TEXT,
  requester_user_id UUID,
  approver_user_id UUID,
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.trade_requests ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for trade requests
CREATE POLICY "Users can view their organization's trade requests" 
ON public.trade_requests 
FOR SELECT 
USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can create trade requests for their organization" 
ON public.trade_requests 
FOR INSERT 
WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "Users can update their organization's trade requests" 
ON public.trade_requests 
FOR UPDATE 
USING (organization_id = get_user_organization_id());

CREATE POLICY "Supervisors can manage all trade requests" 
ON public.trade_requests 
FOR ALL 
USING (is_supervisor());

-- Create trigger for updated_at
CREATE TRIGGER update_trade_requests_updated_at
  BEFORE UPDATE ON public.trade_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create notification preferences table
CREATE TABLE public.trade_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trade_request_id UUID NOT NULL REFERENCES public.trade_requests(id) ON DELETE CASCADE,
  recipient_family_group TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  notification_type TEXT NOT NULL CHECK (notification_type IN ('request_created', 'request_approved', 'request_rejected', 'request_cancelled')),
  sent_at TIMESTAMP WITH TIME ZONE,
  organization_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.trade_notifications ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for trade notifications
CREATE POLICY "Users can view their organization's trade notifications" 
ON public.trade_notifications 
FOR SELECT 
USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can manage their organization's trade notifications" 
ON public.trade_notifications 
FOR ALL 
USING (organization_id = get_user_organization_id());

CREATE POLICY "Supervisors can manage all trade notifications" 
ON public.trade_notifications 
FOR ALL 
USING (is_supervisor());