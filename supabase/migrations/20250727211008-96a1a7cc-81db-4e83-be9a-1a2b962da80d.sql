-- Update get_user_organization_id function to work with new multi-organization system
CREATE OR REPLACE FUNCTION public.get_user_organization_id()
RETURNS UUID
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT organization_id FROM public.user_organizations 
  WHERE user_id = auth.uid() AND is_primary = true
  LIMIT 1;
$$;