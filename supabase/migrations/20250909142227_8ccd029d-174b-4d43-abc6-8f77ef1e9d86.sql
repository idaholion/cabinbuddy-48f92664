-- Fix search_path for the update function
DROP FUNCTION IF EXISTS public.update_shared_notes_updated_at();

CREATE OR REPLACE FUNCTION public.update_shared_notes_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  NEW.updated_by_user_id = auth.uid();
  RETURN NEW;
END;
$$;