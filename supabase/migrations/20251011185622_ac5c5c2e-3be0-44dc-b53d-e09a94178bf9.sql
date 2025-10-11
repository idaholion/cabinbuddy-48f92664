-- Drop the single-column unique constraint on user_id
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_user_id_key;

-- Add a composite unique constraint on (user_id, organization_id)
-- This allows one profile per user per organization
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_user_id_organization_id_key UNIQUE (user_id, organization_id);