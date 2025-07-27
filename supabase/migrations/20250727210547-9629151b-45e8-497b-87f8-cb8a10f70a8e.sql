-- Phase 1: Create user_organizations junction table for many-to-many relationships
CREATE TABLE public.user_organizations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member', -- admin, member, etc.
  is_primary BOOLEAN NOT NULL DEFAULT false,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, organization_id)
);

-- Enable RLS on user_organizations
ALTER TABLE public.user_organizations ENABLE ROW LEVEL SECURITY;

-- Create policies for user_organizations
CREATE POLICY "Users can view their own organization memberships"
  ON public.user_organizations
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own organization memberships"
  ON public.user_organizations
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own organization memberships"
  ON public.user_organizations
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own organization memberships"
  ON public.user_organizations
  FOR DELETE
  USING (auth.uid() = user_id);

-- Supervisors can view and manage all organization memberships
CREATE POLICY "Supervisors can view all organization memberships"
  ON public.user_organizations
  FOR SELECT
  USING (is_supervisor());

CREATE POLICY "Supervisors can manage all organization memberships"
  ON public.user_organizations
  FOR ALL
  USING (is_supervisor());

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_user_organizations_updated_at
  BEFORE UPDATE ON public.user_organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create new functions to work with multiple organizations
CREATE OR REPLACE FUNCTION public.get_user_organizations(user_uuid UUID DEFAULT auth.uid())
RETURNS TABLE(
  organization_id UUID,
  organization_name TEXT,
  organization_code TEXT,
  role TEXT,
  is_primary BOOLEAN,
  joined_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    uo.organization_id,
    o.name as organization_name,
    o.code as organization_code,
    uo.role,
    uo.is_primary,
    uo.joined_at
  FROM public.user_organizations uo
  JOIN public.organizations o ON uo.organization_id = o.id
  WHERE uo.user_id = user_uuid
  ORDER BY uo.is_primary DESC, uo.joined_at ASC;
$$;

CREATE OR REPLACE FUNCTION public.get_user_primary_organization_id(user_uuid UUID DEFAULT auth.uid())
RETURNS UUID
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT organization_id FROM public.user_organizations 
  WHERE user_id = user_uuid AND is_primary = true
  LIMIT 1;
$$;

-- Function to set primary organization
CREATE OR REPLACE FUNCTION public.set_primary_organization(org_id UUID)
RETURNS BOOLEAN
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- First, unset all primary flags for this user
  UPDATE public.user_organizations 
  SET is_primary = false 
  WHERE user_id = auth.uid();
  
  -- Then set the specified organization as primary
  UPDATE public.user_organizations 
  SET is_primary = true 
  WHERE user_id = auth.uid() AND organization_id = org_id;
  
  -- Return true if the update was successful
  RETURN EXISTS(
    SELECT 1 FROM public.user_organizations 
    WHERE user_id = auth.uid() AND organization_id = org_id AND is_primary = true
  );
END;
$$;

-- Migrate existing users from profiles.organization_id to user_organizations
INSERT INTO public.user_organizations (user_id, organization_id, role, is_primary)
SELECT 
  user_id,
  organization_id,
  'admin', -- Assume existing users are admins of their organizations
  true     -- Make it their primary organization
FROM public.profiles 
WHERE organization_id IS NOT NULL
ON CONFLICT (user_id, organization_id) DO NOTHING;