-- Create recurring_bills table
CREATE TABLE public.recurring_bills (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  due_date TEXT,
  account_number TEXT,
  phone_number TEXT,
  website TEXT,
  amount NUMERIC,
  frequency TEXT NOT NULL DEFAULT 'monthly',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.recurring_bills ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their organization's recurring bills" 
ON public.recurring_bills 
FOR SELECT 
USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can create their organization's recurring bills" 
ON public.recurring_bills 
FOR INSERT 
WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "Users can update their organization's recurring bills" 
ON public.recurring_bills 
FOR UPDATE 
USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can delete their organization's recurring bills" 
ON public.recurring_bills 
FOR DELETE 
USING (organization_id = get_user_organization_id());

-- Supervisors can manage all recurring bills
CREATE POLICY "Supervisors can manage all recurring bills" 
ON public.recurring_bills 
FOR ALL 
USING (is_supervisor());

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_recurring_bills_updated_at
BEFORE UPDATE ON public.recurring_bills
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();