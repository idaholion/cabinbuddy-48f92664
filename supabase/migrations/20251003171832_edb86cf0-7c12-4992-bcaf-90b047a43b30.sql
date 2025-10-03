-- Add extension tracking to selection periods
-- This allows calendar keepers and admins to extend selection time for families

-- Create a table to track selection period extensions
CREATE TABLE IF NOT EXISTS public.selection_period_extensions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  rotation_year INTEGER NOT NULL,
  family_group TEXT NOT NULL,
  original_end_date DATE NOT NULL,
  extended_until DATE NOT NULL,
  extended_by_user_id UUID,
  extension_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT unique_extension_per_family_year UNIQUE (organization_id, rotation_year, family_group)
);

-- Enable RLS
ALTER TABLE public.selection_period_extensions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their organization's extensions"
  ON public.selection_period_extensions
  FOR SELECT
  USING (organization_id = get_user_organization_id());

CREATE POLICY "Calendar keepers and admins can manage extensions"
  ON public.selection_period_extensions
  FOR ALL
  USING (
    organization_id = get_user_organization_id() 
    AND (is_organization_admin() OR is_supervisor())
  );

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_selection_extensions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_selection_extensions_updated_at
  BEFORE UPDATE ON public.selection_period_extensions
  FOR EACH ROW
  EXECUTE FUNCTION update_selection_extensions_updated_at();

-- Index for faster lookups
CREATE INDEX idx_selection_extensions_org_year_family 
  ON public.selection_period_extensions(organization_id, rotation_year, family_group);