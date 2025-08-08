-- Create cabin rules table for storing editable content
CREATE TABLE public.cabin_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  section_type TEXT NOT NULL,
  section_title TEXT NOT NULL,
  content JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.cabin_rules ENABLE ROW LEVEL SECURITY;

-- Create policies for cabin rules
CREATE POLICY "Users can view their organization's cabin rules" 
ON public.cabin_rules 
FOR SELECT 
USING (organization_id = get_user_organization_id());

CREATE POLICY "Organization admins can manage cabin rules" 
ON public.cabin_rules 
FOR ALL 
USING (organization_id = get_user_organization_id() AND is_organization_admin());

CREATE POLICY "Supervisors can manage all cabin rules" 
ON public.cabin_rules 
FOR ALL 
USING (is_supervisor());

-- Create function to update timestamps
CREATE TRIGGER update_cabin_rules_updated_at
BEFORE UPDATE ON public.cabin_rules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();