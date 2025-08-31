-- Create trigger to sync profile updates to family group leads
CREATE TRIGGER sync_profile_to_family_group_lead_trigger
  AFTER INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_profile_to_family_group_lead();

-- Set search path for the function to fix security warning
ALTER FUNCTION public.sync_profile_to_family_group_lead() SET search_path = public;