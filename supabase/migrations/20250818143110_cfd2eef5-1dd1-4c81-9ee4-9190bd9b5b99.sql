-- Fix the critical organizations table security issue first
-- This is a targeted fix to prevent the deadlock

-- Ensure all tables have RLS enabled
ALTER TABLE public.organizations FORCE ROW LEVEL SECURITY;

-- Revoke public access from the organizations table specifically 
REVOKE ALL ON public.organizations FROM PUBLIC;
REVOKE ALL ON public.organizations FROM anon;

-- Also fix the main table that contains profiles
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.profiles FROM PUBLIC;
REVOKE ALL ON public.profiles FROM anon;

-- Fix user organizations table
ALTER TABLE public.user_organizations FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.user_organizations FROM PUBLIC;
REVOKE ALL ON public.user_organizations FROM anon;