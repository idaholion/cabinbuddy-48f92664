-- Create function to check if user is organization admin
CREATE OR REPLACE FUNCTION public.is_organization_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_organizations 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
    AND is_primary = true
  );
$$;

-- Update backup metadata policies to require admin role
DROP POLICY "Authenticated users can view their organization's backup metadata" ON public.backup_metadata;
DROP POLICY "Authenticated users can create backup metadata for their organization" ON public.backup_metadata;
DROP POLICY "Authenticated users can delete their organization's backup metadata" ON public.backup_metadata;

-- Create new admin-only policies
CREATE POLICY "Organization admins can view backup metadata" 
ON public.backup_metadata 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND is_organization_admin());

CREATE POLICY "Organization admins can create backup metadata" 
ON public.backup_metadata 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL AND is_organization_admin());

CREATE POLICY "Organization admins can delete backup metadata" 
ON public.backup_metadata 
FOR DELETE 
USING (auth.uid() IS NOT NULL AND is_organization_admin());

-- Update storage policies to require admin role
DROP POLICY "Authenticated users can view their organization's backups" ON storage.objects;
DROP POLICY "Authenticated users can upload their organization's backups" ON storage.objects;
DROP POLICY "Authenticated users can delete their organization's backups" ON storage.objects;

-- Create new admin-only storage policies
CREATE POLICY "Organization admins can view backups" 
ON storage.objects 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND
  bucket_id = 'organization-backups' 
  AND is_organization_admin()
);

CREATE POLICY "Organization admins can upload backups" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL AND
  bucket_id = 'organization-backups' 
  AND is_organization_admin()
);

CREATE POLICY "Organization admins can delete backups" 
ON storage.objects 
FOR DELETE 
USING (
  auth.uid() IS NOT NULL AND
  bucket_id = 'organization-backups' 
  AND is_organization_admin()
);