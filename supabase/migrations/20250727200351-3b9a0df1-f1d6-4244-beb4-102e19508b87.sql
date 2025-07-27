-- Create supervisors table for managing supervisor access
CREATE TABLE public.supervisors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Add alternate supervisor email to organizations table
ALTER TABLE public.organizations 
ADD COLUMN alternate_supervisor_email TEXT;

-- Enable RLS on supervisors table
ALTER TABLE public.supervisors ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check if user is a supervisor
CREATE OR REPLACE FUNCTION public.is_supervisor()
RETURNS BOOLEAN AS $$
DECLARE
  user_email TEXT;
BEGIN
  -- Get the current user's email from auth.users
  SELECT email INTO user_email FROM auth.users WHERE id = auth.uid();
  
  -- Check if user email exists in supervisors table and is active
  RETURN EXISTS (
    SELECT 1 FROM public.supervisors 
    WHERE email = user_email AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- RLS policies for supervisors table
CREATE POLICY "Supervisors can view all supervisor records" 
ON public.supervisors 
FOR SELECT 
USING (is_supervisor());

CREATE POLICY "Supervisors can manage supervisor records" 
ON public.supervisors 
FOR ALL 
USING (is_supervisor());

-- Update organization policies to allow supervisor access
CREATE POLICY "Supervisors can view all organizations" 
ON public.organizations 
FOR SELECT 
USING (is_supervisor());

CREATE POLICY "Supervisors can manage all organizations" 
ON public.organizations 
FOR ALL 
USING (is_supervisor());

-- Update other tables to allow supervisor access
CREATE POLICY "Supervisors can view all family groups" 
ON public.family_groups 
FOR SELECT 
USING (is_supervisor());

CREATE POLICY "Supervisors can manage all family groups" 
ON public.family_groups 
FOR ALL 
USING (is_supervisor());

CREATE POLICY "Supervisors can view all receipts" 
ON public.receipts 
FOR SELECT 
USING (is_supervisor());

CREATE POLICY "Supervisors can manage all receipts" 
ON public.receipts 
FOR ALL 
USING (is_supervisor());

CREATE POLICY "Supervisors can view all checkin sessions" 
ON public.checkin_sessions 
FOR SELECT 
USING (is_supervisor());

CREATE POLICY "Supervisors can manage all checkin sessions" 
ON public.checkin_sessions 
FOR ALL 
USING (is_supervisor());

CREATE POLICY "Supervisors can view all survey responses" 
ON public.survey_responses 
FOR SELECT 
USING (is_supervisor());

CREATE POLICY "Supervisors can manage all survey responses" 
ON public.survey_responses 
FOR ALL 
USING (is_supervisor());

CREATE POLICY "Supervisors can view all reservation settings" 
ON public.reservation_settings 
FOR SELECT 
USING (is_supervisor());

CREATE POLICY "Supervisors can manage all reservation settings" 
ON public.reservation_settings 
FOR ALL 
USING (is_supervisor());

CREATE POLICY "Supervisors can view all custom checklists" 
ON public.custom_checklists 
FOR SELECT 
USING (is_supervisor());

CREATE POLICY "Supervisors can manage all custom checklists" 
ON public.custom_checklists 
FOR ALL 
USING (is_supervisor());

-- Create trigger for updating timestamps
CREATE TRIGGER update_supervisors_updated_at
BEFORE UPDATE ON public.supervisors
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();