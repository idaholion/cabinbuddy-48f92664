-- Fix RLS policies for checkin_sessions to allow INSERT operations
-- The existing policy uses USING clause which doesn't work for INSERT
-- We need to use WITH CHECK for INSERT operations

-- Drop the existing overly broad policy
DROP POLICY IF EXISTS "Users can manage their organization's check-in sessions" ON public.checkin_sessions;

-- Create separate policies for each operation
CREATE POLICY "Users can insert check-in sessions for their organization" 
ON public.checkin_sessions 
FOR INSERT 
WITH CHECK (organization_id = public.get_user_organization_id());

CREATE POLICY "Users can update their organization's check-in sessions" 
ON public.checkin_sessions 
FOR UPDATE 
USING (organization_id = public.get_user_organization_id())
WITH CHECK (organization_id = public.get_user_organization_id());

CREATE POLICY "Users can delete their organization's check-in sessions" 
ON public.checkin_sessions 
FOR DELETE 
USING (organization_id = public.get_user_organization_id());