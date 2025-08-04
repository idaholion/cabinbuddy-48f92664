-- Fix security warnings by requiring authentication in backup metadata policies
DROP POLICY "Users can view their organization's backup metadata" ON public.backup_metadata;
DROP POLICY "Users can create backup metadata for their organization" ON public.backup_metadata;
DROP POLICY "Users can delete their organization's backup metadata" ON public.backup_metadata;

-- Create new policies that require authentication
CREATE POLICY "Authenticated users can view their organization's backup metadata" 
ON public.backup_metadata 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND organization_id = get_user_organization_id());

CREATE POLICY "Authenticated users can create backup metadata for their organization" 
ON public.backup_metadata 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL AND organization_id = get_user_organization_id());

CREATE POLICY "Authenticated users can delete their organization's backup metadata" 
ON public.backup_metadata 
FOR DELETE 
USING (auth.uid() IS NOT NULL AND organization_id = get_user_organization_id());

-- Fix storage policies to require authentication
DROP POLICY "Users can view their organization's backups" ON storage.objects;
DROP POLICY "Users can upload their organization's backups" ON storage.objects;
DROP POLICY "Users can delete their organization's backups" ON storage.objects;

-- Create new storage policies that require authentication  
CREATE POLICY "Authenticated users can view their organization's backups" 
ON storage.objects 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND
  bucket_id = 'organization-backups' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Authenticated users can upload their organization's backups" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL AND
  bucket_id = 'organization-backups' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Authenticated users can delete their organization's backups" 
ON storage.objects 
FOR DELETE 
USING (
  auth.uid() IS NOT NULL AND
  bucket_id = 'organization-backups' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);