-- Fix the remaining two function search path issues
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_rotation_orders_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Now fix RLS policies to require authentication instead of allowing anonymous access
-- Update all policies to require auth.uid() IS NOT NULL

-- Fix bulk_operation_audit policies
DROP POLICY IF EXISTS "Supervisors can view all audit records" ON public.bulk_operation_audit;
CREATE POLICY "Supervisors can view all audit records" 
ON public.bulk_operation_audit FOR SELECT 
TO authenticated
USING (auth.uid() IS NOT NULL AND is_supervisor());

-- Fix calendar_keeper_requests policies  
DROP POLICY IF EXISTS "Supervisors can manage all calendar keeper requests" ON public.calendar_keeper_requests;
DROP POLICY IF EXISTS "Users can update their organization's requests" ON public.calendar_keeper_requests;
DROP POLICY IF EXISTS "Users can view their organization's requests" ON public.calendar_keeper_requests;

CREATE POLICY "Supervisors can manage all calendar keeper requests" 
ON public.calendar_keeper_requests FOR ALL 
TO authenticated
USING (auth.uid() IS NOT NULL AND is_supervisor());

CREATE POLICY "Users can update their organization's requests" 
ON public.calendar_keeper_requests FOR UPDATE 
TO authenticated
USING (auth.uid() IS NOT NULL AND organization_id = get_user_organization_id());

CREATE POLICY "Users can view their organization's requests" 
ON public.calendar_keeper_requests FOR SELECT 
TO authenticated
USING (auth.uid() IS NOT NULL AND organization_id = get_user_organization_id());

-- Fix checkin_sessions policies
DROP POLICY IF EXISTS "Authenticated users can manage their organization's check-in se" ON public.checkin_sessions;
DROP POLICY IF EXISTS "Authenticated users can view their organization's check-in sess" ON public.checkin_sessions;
DROP POLICY IF EXISTS "Supervisors can manage all checkin sessions" ON public.checkin_sessions;
DROP POLICY IF EXISTS "Supervisors can view all checkin sessions" ON public.checkin_sessions;

CREATE POLICY "Users can manage their organization's check-in sessions" 
ON public.checkin_sessions FOR ALL 
TO authenticated
USING (auth.uid() IS NOT NULL AND organization_id = get_user_organization_id());

CREATE POLICY "Supervisors can manage all checkin sessions" 
ON public.checkin_sessions FOR ALL 
TO authenticated
USING (auth.uid() IS NOT NULL AND is_supervisor());