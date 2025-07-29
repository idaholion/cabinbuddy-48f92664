-- Create calendar_keeper_requests table
CREATE TABLE public.calendar_keeper_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  requester_family_group TEXT NOT NULL,
  requester_user_id UUID,
  requester_email TEXT NOT NULL,
  requester_name TEXT NOT NULL,
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  urgency TEXT NOT NULL DEFAULT 'medium' CHECK (urgency IN ('low', 'medium', 'high')),
  category TEXT NOT NULL DEFAULT 'general' CHECK (category IN ('general', 'booking', 'technical', 'payment', 'emergency')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  calendar_keeper_response TEXT,
  responded_by TEXT,
  responded_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.calendar_keeper_requests ENABLE ROW LEVEL SECURITY;

-- Create policies for calendar keeper requests
CREATE POLICY "Users can view their organization's requests" 
ON public.calendar_keeper_requests 
FOR SELECT 
USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can create requests for their organization" 
ON public.calendar_keeper_requests 
FOR INSERT 
WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "Users can update their organization's requests" 
ON public.calendar_keeper_requests 
FOR UPDATE 
USING (organization_id = get_user_organization_id());

CREATE POLICY "Supervisors can manage all calendar keeper requests" 
ON public.calendar_keeper_requests 
FOR ALL 
USING (is_supervisor());

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_calendar_keeper_requests_updated_at
BEFORE UPDATE ON public.calendar_keeper_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();