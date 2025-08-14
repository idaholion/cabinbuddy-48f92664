-- Add family_group column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS family_group text;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_family_group ON public.profiles(family_group);

-- Update any existing family_role data to family_group 
UPDATE public.profiles 
SET family_group = family_role 
WHERE family_role IS NOT NULL AND family_group IS NULL;