-- Create FAQ items table
CREATE TABLE IF NOT EXISTS public.faq_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  category_order INTEGER NOT NULL DEFAULT 0,
  item_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_faq_items_organization ON public.faq_items(organization_id);
CREATE INDEX IF NOT EXISTS idx_faq_items_category ON public.faq_items(organization_id, category, category_order, item_order);

-- Enable RLS
ALTER TABLE public.faq_items ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can view FAQ items in their organization
CREATE POLICY "Users can view FAQ items in their organization"
ON public.faq_items
FOR SELECT
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id 
    FROM user_organizations 
    WHERE user_id = auth.uid()
  )
);

-- Policy: Admins can insert FAQ items
CREATE POLICY "Admins can insert FAQ items"
ON public.faq_items
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_organizations 
    WHERE user_id = auth.uid() 
    AND organization_id = faq_items.organization_id 
    AND role = 'admin'
  )
);

-- Policy: Admins can update FAQ items
CREATE POLICY "Admins can update FAQ items"
ON public.faq_items
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_organizations 
    WHERE user_id = auth.uid() 
    AND organization_id = faq_items.organization_id 
    AND role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_organizations 
    WHERE user_id = auth.uid() 
    AND organization_id = faq_items.organization_id 
    AND role = 'admin'
  )
);

-- Policy: Admins can delete FAQ items
CREATE POLICY "Admins can delete FAQ items"
ON public.faq_items
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_organizations 
    WHERE user_id = auth.uid() 
    AND organization_id = faq_items.organization_id 
    AND role = 'admin'
  )
);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_faq_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_faq_items_updated_at
BEFORE UPDATE ON public.faq_items
FOR EACH ROW
EXECUTE FUNCTION public.update_faq_items_updated_at();