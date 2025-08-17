-- Add RLS policy for organization admins to view all member share allocations in their organization
CREATE POLICY "Organization admins can view all member allocations in their org" 
ON public.member_share_allocations
FOR SELECT
USING (
  organization_id = get_user_organization_id() 
  AND is_organization_admin()
);

-- Add RLS policy for organization admins to manage all member share allocations in their organization  
CREATE POLICY "Organization admins can manage all member allocations in their org" 
ON public.member_share_allocations
FOR ALL
USING (
  organization_id = get_user_organization_id() 
  AND is_organization_admin()
);