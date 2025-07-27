-- Create rotation_orders table to store family group rotation orders by year
CREATE TABLE public.rotation_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  rotation_year INTEGER NOT NULL,
  rotation_order JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.rotation_orders ENABLE ROW LEVEL SECURITY;

-- Create policies for organization-based access
CREATE POLICY "Authenticated users can view their organization's rotation orders"
ON public.rotation_orders
FOR SELECT
USING (organization_id = get_user_organization_id());

CREATE POLICY "Authenticated users can manage their organization's rotation orders"
ON public.rotation_orders
FOR ALL
USING (organization_id = get_user_organization_id());

-- Create policies for supervisors
CREATE POLICY "Supervisors can view all rotation orders"
ON public.rotation_orders
FOR SELECT
USING (is_supervisor());

CREATE POLICY "Supervisors can manage all rotation orders"
ON public.rotation_orders
FOR ALL
USING (is_supervisor());

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_rotation_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_rotation_orders_updated_at
  BEFORE UPDATE ON public.rotation_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_rotation_orders_updated_at();

-- Create unique constraint to prevent duplicate rotation orders for same org/year
ALTER TABLE public.rotation_orders 
ADD CONSTRAINT unique_org_year UNIQUE (organization_id, rotation_year);