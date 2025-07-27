-- Fix security warnings by restricting policies to authenticated users only

-- Update supervisors table policies
DROP POLICY IF EXISTS "Supervisors can view all supervisor records" ON public.supervisors;
DROP POLICY IF EXISTS "Supervisors can manage supervisor records" ON public.supervisors;

CREATE POLICY "Supervisors can view all supervisor records" 
ON public.supervisors 
FOR SELECT 
TO authenticated
USING (is_supervisor());

CREATE POLICY "Supervisors can manage supervisor records" 
ON public.supervisors 
FOR ALL 
TO authenticated
USING (is_supervisor());

-- Update organization policies
DROP POLICY IF EXISTS "Supervisors can view all organizations" ON public.organizations;
DROP POLICY IF EXISTS "Supervisors can manage all organizations" ON public.organizations;

CREATE POLICY "Supervisors can view all organizations" 
ON public.organizations 
FOR SELECT 
TO authenticated
USING (is_supervisor());

CREATE POLICY "Supervisors can manage all organizations" 
ON public.organizations 
FOR ALL 
TO authenticated
USING (is_supervisor());

-- Update family groups policies
DROP POLICY IF EXISTS "Supervisors can view all family groups" ON public.family_groups;
DROP POLICY IF EXISTS "Supervisors can manage all family groups" ON public.family_groups;

CREATE POLICY "Supervisors can view all family groups" 
ON public.family_groups 
FOR SELECT 
TO authenticated
USING (is_supervisor());

CREATE POLICY "Supervisors can manage all family groups" 
ON public.family_groups 
FOR ALL 
TO authenticated
USING (is_supervisor());

-- Update receipts policies
DROP POLICY IF EXISTS "Supervisors can view all receipts" ON public.receipts;
DROP POLICY IF EXISTS "Supervisors can manage all receipts" ON public.receipts;

CREATE POLICY "Supervisors can view all receipts" 
ON public.receipts 
FOR SELECT 
TO authenticated
USING (is_supervisor());

CREATE POLICY "Supervisors can manage all receipts" 
ON public.receipts 
FOR ALL 
TO authenticated
USING (is_supervisor());

-- Update checkin sessions policies
DROP POLICY IF EXISTS "Supervisors can view all checkin sessions" ON public.checkin_sessions;
DROP POLICY IF EXISTS "Supervisors can manage all checkin sessions" ON public.checkin_sessions;

CREATE POLICY "Supervisors can view all checkin sessions" 
ON public.checkin_sessions 
FOR SELECT 
TO authenticated
USING (is_supervisor());

CREATE POLICY "Supervisors can manage all checkin sessions" 
ON public.checkin_sessions 
FOR ALL 
TO authenticated
USING (is_supervisor());

-- Update survey responses policies
DROP POLICY IF EXISTS "Supervisors can view all survey responses" ON public.survey_responses;
DROP POLICY IF EXISTS "Supervisors can manage all survey responses" ON public.survey_responses;

CREATE POLICY "Supervisors can view all survey responses" 
ON public.survey_responses 
FOR SELECT 
TO authenticated
USING (is_supervisor());

CREATE POLICY "Supervisors can manage all survey responses" 
ON public.survey_responses 
FOR ALL 
TO authenticated
USING (is_supervisor());

-- Update reservation settings policies
DROP POLICY IF EXISTS "Supervisors can view all reservation settings" ON public.reservation_settings;
DROP POLICY IF EXISTS "Supervisors can manage all reservation settings" ON public.reservation_settings;

CREATE POLICY "Supervisors can view all reservation settings" 
ON public.reservation_settings 
FOR SELECT 
TO authenticated
USING (is_supervisor());

CREATE POLICY "Supervisors can manage all reservation settings" 
ON public.reservation_settings 
FOR ALL 
TO authenticated
USING (is_supervisor());

-- Update custom checklists policies
DROP POLICY IF EXISTS "Supervisors can view all custom checklists" ON public.custom_checklists;
DROP POLICY IF EXISTS "Supervisors can manage all custom checklists" ON public.custom_checklists;

CREATE POLICY "Supervisors can view all custom checklists" 
ON public.custom_checklists 
FOR SELECT 
TO authenticated
USING (is_supervisor());

CREATE POLICY "Supervisors can manage all custom checklists" 
ON public.custom_checklists 
FOR ALL 
TO authenticated
USING (is_supervisor());