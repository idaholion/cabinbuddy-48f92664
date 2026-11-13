-- Security hardening: organization code lookup + storage write/read ownership.
-- Does not modify any files, reservations, or organization data.

-- 1) Organization code lookup: replace "USING (true)" with a name-only lookup function
CREATE OR REPLACE FUNCTION public.get_organization_name_by_code(_code text)
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT o.name FROM public.organizations o
  WHERE _code IS NOT NULL AND length(trim(_code)) >= 4
    AND o.code = upper(trim(_code))
  LIMIT 1
$$;
REVOKE ALL ON FUNCTION public.get_organization_name_by_code(text) FROM public;
GRANT EXECUTE ON FUNCTION public.get_organization_name_by_code(text) TO anon, authenticated;

DROP POLICY IF EXISTS "Anyone can lookup organizations by code to join" ON public.organizations;

-- Helper: folder belongs to the caller or to someone sharing an organization
CREATE OR REPLACE FUNCTION public.storage_folder_shares_org(_folder text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT auth.uid() IS NOT NULL AND (
    _folder = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM public.user_organizations me
      JOIN public.user_organizations them ON them.organization_id = me.organization_id
      WHERE me.user_id = auth.uid() AND them.user_id::text = _folder)
  )
$$;
GRANT EXECUTE ON FUNCTION public.storage_folder_shares_org(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.storage_is_my_org(_folder text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_organizations
    WHERE user_id = auth.uid() AND organization_id::text = _folder)
$$;
GRANT EXECUTE ON FUNCTION public.storage_is_my_org(text) TO authenticated;

-- 2) Avatars: one read policy for signed-in users (public URLs keep working)
DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;
DROP POLICY IF EXISTS "User avatars are publicly accessible" ON storage.objects;
CREATE POLICY "Signed-in users can view avatars" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'user-avatars' AND owner_id = (select auth.uid()::text)
         OR bucket_id = 'user-avatars' AND public.storage_folder_shares_org((storage.foldername(name))[1]));

-- 3) Photos: own folder (userId/...) or maintenance/<orgId>/...
DROP POLICY IF EXISTS "Users can upload photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their organization's photos" ON storage.objects;
CREATE POLICY "Photos insert own or org maintenance" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'photos' AND (
    (storage.foldername(name))[1] = (select auth.uid()::text)
    OR ((storage.foldername(name))[1] = 'maintenance' AND public.storage_is_my_org((storage.foldername(name))[2]))));
CREATE POLICY "Photos update own or org maintenance" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'photos' AND (
    owner_id = (select auth.uid()::text)
    OR ((storage.foldername(name))[1] = 'maintenance' AND public.storage_is_my_org((storage.foldername(name))[2]))));
CREATE POLICY "Photos delete own or org maintenance" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'photos' AND (
    owner_id = (select auth.uid()::text)
    OR ((storage.foldername(name))[1] = 'maintenance' AND public.storage_is_my_org((storage.foldername(name))[2]))));
CREATE POLICY "Photos view within organization" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'photos' AND (
    owner_id = (select auth.uid()::text)
    OR public.storage_folder_shares_org((storage.foldername(name))[1])
    OR ((storage.foldername(name))[1] = 'maintenance' AND public.storage_is_my_org((storage.foldername(name))[2]))));

-- 4) Receipt images: write to own folder; read within shared organization
DROP POLICY IF EXISTS "Users can upload receipt images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own receipt images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own receipt images" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their organization's receipt images" ON storage.objects;
CREATE POLICY "Receipts insert own folder" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'receipt-images' AND (storage.foldername(name))[1] = (select auth.uid()::text));
CREATE POLICY "Receipts update own" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'receipt-images' AND (owner_id = (select auth.uid()::text)
         OR (storage.foldername(name))[1] = (select auth.uid()::text)));
CREATE POLICY "Receipts delete own" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'receipt-images' AND (owner_id = (select auth.uid()::text)
         OR (storage.foldername(name))[1] = (select auth.uid()::text)));
CREATE POLICY "Receipts view within organization" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'receipt-images' AND public.storage_folder_shares_org((storage.foldername(name))[1]));

-- 5) Checklist images: keep existing organization-folder policies; remove unbound ones,
--    allow uploader to manage their own root-level library files.
DROP POLICY IF EXISTS "Authenticated users can upload checklist images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their organization's checklist images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their organization's checklist images" ON storage.objects;
DROP POLICY IF EXISTS "Users can view checklist images" ON storage.objects;
CREATE POLICY "Checklist images owner manage" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'checklist-images' AND owner_id = (select auth.uid()::text))
  WITH CHECK (bucket_id = 'checklist-images' AND owner_id = (select auth.uid()::text));

-- 6) Documents: organization-folder insert policy already exists; remove unbound one
DROP POLICY IF EXISTS "Users can upload documents" ON storage.objects;
