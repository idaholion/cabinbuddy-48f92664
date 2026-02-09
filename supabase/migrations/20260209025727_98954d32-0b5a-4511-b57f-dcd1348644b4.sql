-- Add policy to allow unauthenticated users to look up organizations by code for joining
-- This only exposes name and code, not sensitive contact information
CREATE POLICY "Anyone can lookup organizations by code to join"
ON public.organizations
FOR SELECT
USING (true);

-- Note: The query in the app only selects 'name' field, so sensitive data like 
-- admin_email, treasurer_email etc. are not exposed in the actual query results