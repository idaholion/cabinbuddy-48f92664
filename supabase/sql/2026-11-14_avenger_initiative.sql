-- Avenger Initiative: private succession hub for Richard and Sam only.
CREATE OR REPLACE FUNCTION public.is_avenger_member()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT lower(coalesce(auth.jwt() ->> 'email', '')) IN ('rvandrew@outlook.com', 'samvandrew@gmail.com');
$$;
REVOKE ALL ON FUNCTION public.is_avenger_member() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.is_avenger_member() TO authenticated;

CREATE TABLE IF NOT EXISTS public.avenger_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL DEFAULT 'General',
  title text NOT NULL,
  url text,
  username text,
  secret text,
  notes text,
  updated_by_email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.avenger_entries TO authenticated;
GRANT ALL ON public.avenger_entries TO service_role;
ALTER TABLE public.avenger_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Avengers only" ON public.avenger_entries;
CREATE POLICY "Avengers only" ON public.avenger_entries FOR ALL TO authenticated
  USING (public.is_avenger_member()) WITH CHECK (public.is_avenger_member());

CREATE OR REPLACE FUNCTION public.touch_avenger_entry()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  NEW.updated_by_email = auth.jwt() ->> 'email';
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS touch_avenger_entry ON public.avenger_entries;
CREATE TRIGGER touch_avenger_entry BEFORE INSERT OR UPDATE ON public.avenger_entries
  FOR EACH ROW EXECUTE FUNCTION public.touch_avenger_entry();
