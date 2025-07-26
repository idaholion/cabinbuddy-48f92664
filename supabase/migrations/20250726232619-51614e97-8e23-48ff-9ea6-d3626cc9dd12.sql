-- Fix security issues by restricting policies to authenticated users only
-- and fix function search path

-- First, fix the function search path
CREATE OR REPLACE FUNCTION public.get_user_organization_id()
RETURNS UUID
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = 'public'
AS $$
  SELECT organization_id FROM public.profiles WHERE user_id = auth.uid();
$$;

-- Drop existing policies that allow anonymous access
DROP POLICY IF EXISTS "Users can view their organization" ON public.organizations;
DROP POLICY IF EXISTS "Users can update their organization" ON public.organizations;
DROP POLICY IF EXISTS "Users can create organizations" ON public.organizations;
DROP POLICY IF EXISTS "Users can view their organization's family groups" ON public.family_groups;
DROP POLICY IF EXISTS "Users can manage their organization's family groups" ON public.family_groups;
DROP POLICY IF EXISTS "Users can view their organization's reservation settings" ON public.reservation_settings;
DROP POLICY IF EXISTS "Users can manage their organization's reservation settings" ON public.reservation_settings;
DROP POLICY IF EXISTS "Users can view their organization's checklists" ON public.custom_checklists;
DROP POLICY IF EXISTS "Users can manage their organization's checklists" ON public.custom_checklists;
DROP POLICY IF EXISTS "Users can view their organization's check-in sessions" ON public.checkin_sessions;
DROP POLICY IF EXISTS "Users can manage their organization's check-in sessions" ON public.checkin_sessions;
DROP POLICY IF EXISTS "Users can view their organization's survey responses" ON public.survey_responses;
DROP POLICY IF EXISTS "Users can manage their organization's survey responses" ON public.survey_responses;
DROP POLICY IF EXISTS "Users can view their organization's receipts" ON public.receipts;
DROP POLICY IF EXISTS "Users can manage their organization's receipts" ON public.receipts;

-- Create new policies restricted to authenticated users only
-- Organizations policies
CREATE POLICY "Authenticated users can view their organization" 
ON public.organizations 
FOR SELECT 
TO authenticated
USING (id = public.get_user_organization_id());

CREATE POLICY "Authenticated users can update their organization" 
ON public.organizations 
FOR UPDATE 
TO authenticated
USING (id = public.get_user_organization_id());

CREATE POLICY "Authenticated users can create organizations" 
ON public.organizations 
FOR INSERT 
TO authenticated
WITH CHECK (true);

-- Family groups policies
CREATE POLICY "Authenticated users can view their organization's family groups" 
ON public.family_groups 
FOR SELECT 
TO authenticated
USING (organization_id = public.get_user_organization_id());

CREATE POLICY "Authenticated users can manage their organization's family groups" 
ON public.family_groups 
FOR ALL 
TO authenticated
USING (organization_id = public.get_user_organization_id());

-- Reservation settings policies
CREATE POLICY "Authenticated users can view their organization's reservation settings" 
ON public.reservation_settings 
FOR SELECT 
TO authenticated
USING (organization_id = public.get_user_organization_id());

CREATE POLICY "Authenticated users can manage their organization's reservation settings" 
ON public.reservation_settings 
FOR ALL 
TO authenticated
USING (organization_id = public.get_user_organization_id());

-- Custom checklists policies
CREATE POLICY "Authenticated users can view their organization's checklists" 
ON public.custom_checklists 
FOR SELECT 
TO authenticated
USING (organization_id = public.get_user_organization_id());

CREATE POLICY "Authenticated users can manage their organization's checklists" 
ON public.custom_checklists 
FOR ALL 
TO authenticated
USING (organization_id = public.get_user_organization_id());

-- Check-in sessions policies
CREATE POLICY "Authenticated users can view their organization's check-in sessions" 
ON public.checkin_sessions 
FOR SELECT 
TO authenticated
USING (organization_id = public.get_user_organization_id());

CREATE POLICY "Authenticated users can manage their organization's check-in sessions" 
ON public.checkin_sessions 
FOR ALL 
TO authenticated
USING (organization_id = public.get_user_organization_id());

-- Survey responses policies
CREATE POLICY "Authenticated users can view their organization's survey responses" 
ON public.survey_responses 
FOR SELECT 
TO authenticated
USING (organization_id = public.get_user_organization_id());

CREATE POLICY "Authenticated users can manage their organization's survey responses" 
ON public.survey_responses 
FOR ALL 
TO authenticated
USING (organization_id = public.get_user_organization_id());

-- Receipts policies
CREATE POLICY "Authenticated users can view their organization's receipts" 
ON public.receipts 
FOR SELECT 
TO authenticated
USING (organization_id = public.get_user_organization_id());

CREATE POLICY "Authenticated users can manage their organization's receipts" 
ON public.receipts 
FOR ALL 
TO authenticated
USING (organization_id = public.get_user_organization_id());