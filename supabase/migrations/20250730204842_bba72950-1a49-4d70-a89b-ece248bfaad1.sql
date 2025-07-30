-- Data Isolation Safeguards Migration
-- This migration adds foreign key constraints, strengthens RLS policies, and implements audit controls

-- 1. Add foreign key constraints for organization_id columns
-- This prevents orphaned records and ensures data integrity

ALTER TABLE bulk_operation_audit 
ADD CONSTRAINT fk_bulk_operation_audit_organization 
FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE calendar_keeper_requests 
ADD CONSTRAINT fk_calendar_keeper_requests_organization 
FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE checkin_sessions 
ADD CONSTRAINT fk_checkin_sessions_organization 
FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE custom_checklists 
ADD CONSTRAINT fk_custom_checklists_organization 
FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE family_groups 
ADD CONSTRAINT fk_family_groups_organization 
FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE notification_log 
ADD CONSTRAINT fk_notification_log_organization 
FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE receipts 
ADD CONSTRAINT fk_receipts_organization 
FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE recurring_bills 
ADD CONSTRAINT fk_recurring_bills_organization 
FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE reservation_periods 
ADD CONSTRAINT fk_reservation_periods_organization 
FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE reservation_settings 
ADD CONSTRAINT fk_reservation_settings_organization 
FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE reservations 
ADD CONSTRAINT fk_reservations_organization 
FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE rotation_orders 
ADD CONSTRAINT fk_rotation_orders_organization 
FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE secondary_selection_status 
ADD CONSTRAINT fk_secondary_selection_status_organization 
FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE survey_responses 
ADD CONSTRAINT fk_survey_responses_organization 
FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE time_period_usage 
ADD CONSTRAINT fk_time_period_usage_organization 
FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE trade_notifications 
ADD CONSTRAINT fk_trade_notifications_organization 
FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE trade_requests 
ADD CONSTRAINT fk_trade_requests_organization 
FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE user_organizations 
ADD CONSTRAINT fk_user_organizations_organization 
FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

-- 2. Add NOT NULL constraints where organization_id should never be null
ALTER TABLE family_groups ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE receipts ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE recurring_bills ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE reservation_periods ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE reservation_settings ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE reservations ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE rotation_orders ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE secondary_selection_status ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE survey_responses ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE time_period_usage ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE trade_notifications ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE trade_requests ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE user_organizations ALTER COLUMN organization_id SET NOT NULL;

-- 3. Ensure organization codes are unique to prevent conflicts
ALTER TABLE organizations ADD CONSTRAINT unique_organization_code UNIQUE (code);

-- 4. Update security definer functions to use proper search_path
CREATE OR REPLACE FUNCTION public.get_user_organization_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT organization_id FROM public.user_organizations 
  WHERE user_id = auth.uid() AND is_primary = true
  LIMIT 1;
$function$;

CREATE OR REPLACE FUNCTION public.get_user_organizations(user_uuid uuid DEFAULT auth.uid())
RETURNS TABLE(organization_id uuid, organization_name text, organization_code text, role text, is_primary boolean, joined_at timestamp with time zone)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.get_user_primary_organization_id(user_uuid uuid DEFAULT auth.uid())
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT organization_id FROM public.user_organizations 
  WHERE user_id = user_uuid AND is_primary = true
  LIMIT 1;
$function$;

CREATE OR REPLACE FUNCTION public.set_primary_organization(org_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Verify user has access to this organization
  IF NOT EXISTS(
    SELECT 1 FROM public.user_organizations 
    WHERE user_id = auth.uid() AND organization_id = org_id
  ) THEN
    RAISE EXCEPTION 'Access denied: User is not a member of organization %', org_id;
  END IF;
  
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
$function$;

CREATE OR REPLACE FUNCTION public.is_supervisor()
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  user_email TEXT;
BEGIN
  -- Get the current user's email from auth.users
  SELECT email INTO user_email FROM auth.users WHERE id = auth.uid();
  
  -- Check if user email exists in supervisors table and is active
  RETURN EXISTS (
    SELECT 1 FROM public.supervisors 
    WHERE email = user_email AND is_active = true
  );
END;
$function$;

-- 5. Create organization access audit table
CREATE TABLE public.organization_access_audit (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  attempted_organization_id UUID,
  user_organization_id UUID,
  access_type TEXT NOT NULL, -- 'read', 'write', 'delete'
  table_name TEXT NOT NULL,
  operation_type TEXT NOT NULL, -- 'SELECT', 'INSERT', 'UPDATE', 'DELETE'
  success BOOLEAN NOT NULL DEFAULT false,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on audit table
ALTER TABLE public.organization_access_audit ENABLE ROW LEVEL SECURITY;

-- Only supervisors can view audit logs
CREATE POLICY "Supervisors can view all access audit logs" 
ON public.organization_access_audit 
FOR SELECT 
USING (is_supervisor());

-- System can insert audit records
CREATE POLICY "System can insert access audit records" 
ON public.organization_access_audit 
FOR INSERT 
WITH CHECK (true);

-- 6. Create organization data validation function
CREATE OR REPLACE FUNCTION public.validate_organization_access(
  target_org_id UUID,
  operation_name TEXT DEFAULT 'unknown'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  user_org_id UUID;
  user_has_access BOOLEAN := false;
BEGIN
  -- Get user's primary organization
  SELECT get_user_organization_id() INTO user_org_id;
  
  -- Check if user has access to target organization
  SELECT EXISTS(
    SELECT 1 FROM public.user_organizations 
    WHERE user_id = auth.uid() AND organization_id = target_org_id
  ) INTO user_has_access;
  
  -- Log the access attempt
  INSERT INTO public.organization_access_audit (
    user_id, 
    attempted_organization_id, 
    user_organization_id,
    access_type,
    table_name,
    operation_type,
    success
  ) VALUES (
    auth.uid(),
    target_org_id,
    user_org_id,
    'validation',
    operation_name,
    'CHECK',
    user_has_access
  );
  
  -- Return access result
  RETURN user_has_access;
END;
$function$;

-- 7. Add organization validation trigger function
CREATE OR REPLACE FUNCTION public.validate_organization_data_access()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Skip validation for supervisors
  IF is_supervisor() THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  
  -- For INSERT and UPDATE operations
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    -- Validate organization access
    IF NOT validate_organization_access(NEW.organization_id, TG_TABLE_NAME || '_' || TG_OP) THEN
      RAISE EXCEPTION 'Access denied: Cannot % data for organization %', TG_OP, NEW.organization_id;
    END IF;
    RETURN NEW;
  END IF;
  
  -- For DELETE operations
  IF TG_OP = 'DELETE' THEN
    -- Validate organization access
    IF NOT validate_organization_access(OLD.organization_id, TG_TABLE_NAME || '_' || TG_OP) THEN
      RAISE EXCEPTION 'Access denied: Cannot % data for organization %', TG_OP, OLD.organization_id;
    END IF;
    RETURN OLD;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- 8. Apply validation triggers to all organization-scoped tables
CREATE TRIGGER validate_family_groups_access
  BEFORE INSERT OR UPDATE OR DELETE ON public.family_groups
  FOR EACH ROW EXECUTE FUNCTION validate_organization_data_access();

CREATE TRIGGER validate_receipts_access
  BEFORE INSERT OR UPDATE OR DELETE ON public.receipts
  FOR EACH ROW EXECUTE FUNCTION validate_organization_data_access();

CREATE TRIGGER validate_reservations_access
  BEFORE INSERT OR UPDATE OR DELETE ON public.reservations
  FOR EACH ROW EXECUTE FUNCTION validate_organization_data_access();

CREATE TRIGGER validate_recurring_bills_access
  BEFORE INSERT OR UPDATE OR DELETE ON public.recurring_bills
  FOR EACH ROW EXECUTE FUNCTION validate_organization_data_access();

CREATE TRIGGER validate_reservation_settings_access
  BEFORE INSERT OR UPDATE OR DELETE ON public.reservation_settings
  FOR EACH ROW EXECUTE FUNCTION validate_organization_data_access();

CREATE TRIGGER validate_trade_requests_access
  BEFORE INSERT OR UPDATE OR DELETE ON public.trade_requests
  FOR EACH ROW EXECUTE FUNCTION validate_organization_data_access();

-- 9. Update get_available_colors function with better security
CREATE OR REPLACE FUNCTION public.get_available_colors(p_organization_id uuid, p_current_group_id uuid DEFAULT NULL::uuid)
RETURNS text[]
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  default_colors TEXT[] := ARRAY[
    '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', 
    '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#6366f1', '#84cc16', 
    '#f43f5e', '#14b8a6', '#a855f7', '#64748b'
  ];
  used_colors TEXT[];
  available_colors TEXT[];
BEGIN
  -- Validate organization access
  IF NOT is_supervisor() AND NOT validate_organization_access(p_organization_id, 'get_available_colors') THEN
    RAISE EXCEPTION 'Access denied: Cannot access colors for organization %', p_organization_id;
  END IF;
  
  -- Get colors currently used by other groups in the organization
  SELECT ARRAY_AGG(color) INTO used_colors
  FROM family_groups 
  WHERE organization_id = p_organization_id 
    AND color IS NOT NULL
    AND (p_current_group_id IS NULL OR id != p_current_group_id);
    
  -- Return colors that are not used
  SELECT ARRAY_AGG(color) INTO available_colors
  FROM unnest(default_colors) AS color
  WHERE color != ALL(COALESCE(used_colors, ARRAY[]::TEXT[]));
  
  RETURN COALESCE(available_colors, ARRAY[]::TEXT[]);
END;
$function$;