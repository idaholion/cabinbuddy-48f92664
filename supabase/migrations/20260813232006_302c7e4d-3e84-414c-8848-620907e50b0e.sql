-- Helper: is the current user an admin of a SPECIFIC organization?
CREATE OR REPLACE FUNCTION public.is_org_admin_for(p_organization_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p_organization_id IS NOT NULL AND auth.uid() IS NOT NULL AND (
    EXISTS (
      SELECT 1 FROM public.user_organizations uo
      WHERE uo.user_id = auth.uid()
        AND uo.organization_id = p_organization_id
        AND uo.role IN ('admin','owner','treasurer','calendar_keeper')
    )
    OR EXISTS (
      SELECT 1
      FROM public.organizations o
      JOIN public.user_organizations uo
        ON uo.organization_id = o.id AND uo.user_id = auth.uid()
      WHERE o.id = p_organization_id
        AND lower(coalesce((SELECT u.email FROM auth.users u WHERE u.id = auth.uid()), '')) IN (
          lower(coalesce(o.admin_email, '')),
          lower(coalesce(o.treasurer_email, '')),
          lower(coalesce(o.calendar_keeper_email, ''))
        )
    )
    OR public.is_supervisor()
  );
$$;

-- Helper: is the current user a member of a SPECIFIC organization?
CREATE OR REPLACE FUNCTION public.is_org_member_of(p_organization_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p_organization_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.user_organizations uo
    WHERE uo.user_id = auth.uid()
      AND uo.organization_id = p_organization_id
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_org_admin_for(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_org_member_of(uuid) TO authenticated;

-- Cabin rules: scope to the owning organization, not the user's "primary" org
DROP POLICY IF EXISTS "Organization admins can manage cabin rules" ON public.cabin_rules;
DROP POLICY IF EXISTS "Users can view their organization's cabin rules" ON public.cabin_rules;

CREATE POLICY "Members can view their organization cabin rules" ON public.cabin_rules
  FOR SELECT TO authenticated
  USING (public.is_org_member_of(organization_id));

CREATE POLICY "Org admins can manage their organization cabin rules" ON public.cabin_rules
  FOR ALL TO authenticated
  USING (public.is_org_admin_for(organization_id))
  WITH CHECK (public.is_org_admin_for(organization_id));

-- Checklist images: same membership-based scoping
DROP POLICY IF EXISTS "Users can view their organization's images" ON public.checklist_images;
DROP POLICY IF EXISTS "Users can create images for their organization" ON public.checklist_images;
DROP POLICY IF EXISTS "Users can update their organization's images" ON public.checklist_images;
DROP POLICY IF EXISTS "Users can delete their organization's images" ON public.checklist_images;

CREATE POLICY "Members can view their organization images" ON public.checklist_images
  FOR SELECT TO authenticated
  USING (public.is_org_member_of(organization_id));

CREATE POLICY "Members can create their organization images" ON public.checklist_images
  FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member_of(organization_id));

CREATE POLICY "Members can update their organization images" ON public.checklist_images
  FOR UPDATE TO authenticated
  USING (public.is_org_member_of(organization_id))
  WITH CHECK (public.is_org_member_of(organization_id));

CREATE POLICY "Members can delete their organization images" ON public.checklist_images
  FOR DELETE TO authenticated
  USING (public.is_org_member_of(organization_id));

-- Custom checklists: allow any org the user belongs to (not only the primary one)
DROP POLICY IF EXISTS "Users can manage their organization's checklists" ON public.custom_checklists;

CREATE POLICY "Members can manage their organization checklists" ON public.custom_checklists
  FOR ALL TO authenticated
  USING (public.is_org_member_of(organization_id))
  WITH CHECK (public.is_org_member_of(organization_id));