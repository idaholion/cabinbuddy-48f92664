-- Create a security definer function to get current user's email
CREATE OR REPLACE FUNCTION public.get_current_user_email()
RETURNS TEXT 
LANGUAGE SQL 
SECURITY DEFINER 
STABLE
SET search_path TO 'public'
AS $$
  SELECT email FROM auth.users WHERE id = auth.uid();
$$;

-- Drop existing policies that reference auth.users directly
DROP POLICY IF EXISTS "Family leads can manage their group's member allocations" ON public.member_share_allocations;
DROP POLICY IF EXISTS "Family leads can view their group's member allocations" ON public.member_share_allocations;

-- Create new policies using the security definer function
CREATE POLICY "Family leads can manage their group's member allocations" 
ON public.member_share_allocations
FOR ALL
USING (
  organization_id = get_user_organization_id() 
  AND EXISTS (
    SELECT 1 FROM family_groups 
    WHERE family_groups.organization_id = get_user_organization_id() 
    AND family_groups.name = member_share_allocations.family_group_name 
    AND (
      family_groups.lead_email = get_current_user_email() 
      OR family_groups.alternate_lead_id = get_current_user_email()
    )
  )
);

CREATE POLICY "Family leads can view their group's member allocations" 
ON public.member_share_allocations
FOR SELECT
USING (
  organization_id = get_user_organization_id() 
  AND EXISTS (
    SELECT 1 FROM family_groups 
    WHERE family_groups.organization_id = get_user_organization_id() 
    AND family_groups.name = member_share_allocations.family_group_name 
    AND (
      family_groups.lead_email = get_current_user_email() 
      OR family_groups.alternate_lead_id = get_current_user_email()
    )
  )
);