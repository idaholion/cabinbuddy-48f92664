-- Fix critical security issues: Anonymous access policies and function security

-- 1. Fix function search path security by setting search_path on existing functions
ALTER FUNCTION public.update_payment_status() SET search_path = 'public';
ALTER FUNCTION public.get_user_organization_id() SET search_path = 'public';
ALTER FUNCTION public.supervisor_bulk_update_leads(uuid, text, text, text) SET search_path = 'public';
ALTER FUNCTION public.rename_family_group(uuid, text, text) SET search_path = 'public';
ALTER FUNCTION public.supervisor_delete_organization(uuid, text) SET search_path = 'public';
ALTER FUNCTION public.supervisor_bulk_update_family_groups(uuid, text) SET search_path = 'public';
ALTER FUNCTION public.supervisor_bulk_remove_host_member(uuid, text, text) SET search_path = 'public';
ALTER FUNCTION public.update_rotation_orders_updated_at() SET search_path = 'public';
ALTER FUNCTION public.supervisor_reset_database(text) SET search_path = 'public';
ALTER FUNCTION public.set_primary_organization(uuid) SET search_path = 'public';
ALTER FUNCTION public.create_reservation_payment(uuid, boolean, numeric) SET search_path = 'public';
ALTER FUNCTION public.validate_organization_data_access() SET search_path = 'public';
ALTER FUNCTION public.supervisor_bulk_update_reservations(uuid, text, boolean, boolean) SET search_path = 'public';
ALTER FUNCTION public.is_supervisor() SET search_path = 'public';
ALTER FUNCTION public.get_user_organizations(uuid) SET search_path = 'public';
ALTER FUNCTION public.get_user_primary_organization_id(uuid) SET search_path = 'public';
ALTER FUNCTION public.validate_organization_access(uuid, text) SET search_path = 'public';
ALTER FUNCTION public.assign_default_colors() SET search_path = 'public';
ALTER FUNCTION public.check_bulk_family_group_update() SET search_path = 'public';
ALTER FUNCTION public.get_available_colors(uuid, uuid) SET search_path = 'public';
ALTER FUNCTION public.is_organization_admin() SET search_path = 'public';
ALTER FUNCTION public.supervisor_cleanup_duplicate_family_groups() SET search_path = 'public';
ALTER FUNCTION public.get_current_user_email() SET search_path = 'public';
ALTER FUNCTION public.handle_new_user() SET search_path = 'public';
ALTER FUNCTION public.update_updated_at_column() SET search_path = 'public';
ALTER FUNCTION public.update_profiles_updated_at() SET search_path = 'public';

-- 2. Fix anonymous access policies by restricting to authenticated users only
-- Update all policies that allow anonymous access to require authentication

-- Backup metadata policies
DROP POLICY IF EXISTS "Organization admins can delete backup metadata" ON public.backup_metadata;
CREATE POLICY "Organization admins can delete backup metadata" ON public.backup_metadata
  FOR DELETE TO authenticated
  USING (is_organization_admin() AND organization_id = get_user_organization_id());

DROP POLICY IF EXISTS "Organization admins can view backup metadata" ON public.backup_metadata;
CREATE POLICY "Organization admins can view backup metadata" ON public.backup_metadata
  FOR SELECT TO authenticated
  USING (is_organization_admin() AND organization_id = get_user_organization_id());

DROP POLICY IF EXISTS "Organization admins can create backup metadata" ON public.backup_metadata;
CREATE POLICY "Organization admins can create backup metadata" ON public.backup_metadata
  FOR INSERT TO authenticated
  WITH CHECK (is_organization_admin() AND organization_id = get_user_organization_id());

-- Supervisors policies - restrict to authenticated
DROP POLICY IF EXISTS "Supervisors can manage all backup metadata" ON public.backup_metadata;
CREATE POLICY "Supervisors can manage all backup metadata" ON public.backup_metadata
  FOR ALL TO authenticated
  USING (is_supervisor());

-- Fix bulk operation audit policies
DROP POLICY IF EXISTS "Supervisors can view all audit records" ON public.bulk_operation_audit;
CREATE POLICY "Supervisors can view all audit records" ON public.bulk_operation_audit
  FOR SELECT TO authenticated
  USING (is_supervisor());

-- Fix cabin rules policies
DROP POLICY IF EXISTS "Organization admins can manage cabin rules" ON public.cabin_rules;
CREATE POLICY "Organization admins can manage cabin rules" ON public.cabin_rules
  FOR ALL TO authenticated
  USING (organization_id = get_user_organization_id() AND is_organization_admin());

DROP POLICY IF EXISTS "Users can view their organization's cabin rules" ON public.cabin_rules;
CREATE POLICY "Users can view their organization's cabin rules" ON public.cabin_rules
  FOR SELECT TO authenticated
  USING (organization_id = get_user_organization_id());

-- Fix calendar keeper requests policies
DROP POLICY IF EXISTS "Users can create requests for their organization" ON public.calendar_keeper_requests;
CREATE POLICY "Users can create requests for their organization" ON public.calendar_keeper_requests
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = get_user_organization_id());

DROP POLICY IF EXISTS "Users can update their organization's requests" ON public.calendar_keeper_requests;
CREATE POLICY "Users can update their organization's requests" ON public.calendar_keeper_requests
  FOR UPDATE TO authenticated
  USING (organization_id = get_user_organization_id());

DROP POLICY IF EXISTS "Users can view their organization's requests" ON public.calendar_keeper_requests;
CREATE POLICY "Users can view their organization's requests" ON public.calendar_keeper_requests
  FOR SELECT TO authenticated
  USING (organization_id = get_user_organization_id());

-- Fix organizations policies - restrict "Authenticated users can create organizations"
DROP POLICY IF EXISTS "Authenticated users can create organizations" ON public.organizations;
CREATE POLICY "Authenticated users can create organizations" ON public.organizations
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can update their organization" ON public.organizations;
CREATE POLICY "Authenticated users can update their organization" ON public.organizations
  FOR UPDATE TO authenticated
  USING (id = get_user_organization_id())
  WITH CHECK (id = get_user_organization_id());

DROP POLICY IF EXISTS "Authenticated users can view their organization" ON public.organizations;
CREATE POLICY "Authenticated users can view their organization" ON public.organizations
  FOR SELECT TO authenticated
  USING (id = get_user_organization_id());