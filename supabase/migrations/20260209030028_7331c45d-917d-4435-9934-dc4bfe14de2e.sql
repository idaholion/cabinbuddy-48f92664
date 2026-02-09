-- Grant SELECT permission to anon role on organizations table
-- This allows unauthenticated users to look up organizations by code
GRANT SELECT ON public.organizations TO anon;