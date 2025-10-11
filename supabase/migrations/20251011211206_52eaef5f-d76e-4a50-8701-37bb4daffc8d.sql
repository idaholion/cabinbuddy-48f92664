-- Add SELECT policy for checkin_sessions so users can read their organization's sessions
CREATE POLICY "Users can view their organization's check-in sessions"
ON public.checkin_sessions
FOR SELECT
TO public
USING (organization_id = get_user_organization_id());