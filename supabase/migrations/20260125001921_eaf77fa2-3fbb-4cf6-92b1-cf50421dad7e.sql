-- Create table for CB (CabinBuddy) FAQ items that appear in the help assistant
-- These are universal across all organizations and managed by supervisors

CREATE TABLE public.cb_faq_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  route_path text NOT NULL,
  question text NOT NULL,
  answer text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.cb_faq_items ENABLE ROW LEVEL SECURITY;

-- Anyone can view active CB FAQ items (needed for the help button to work)
CREATE POLICY "Anyone can view active CB FAQ items"
  ON public.cb_faq_items
  FOR SELECT
  USING (is_active = true);

-- Only supervisors can manage CB FAQ items
CREATE POLICY "Supervisors can manage all CB FAQ items"
  ON public.cb_faq_items
  FOR ALL
  USING (is_supervisor())
  WITH CHECK (is_supervisor());

-- Create index for faster route lookups
CREATE INDEX idx_cb_faq_items_route ON public.cb_faq_items(route_path);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_cb_faq_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_cb_faq_items_updated_at
  BEFORE UPDATE ON public.cb_faq_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_cb_faq_items_updated_at();