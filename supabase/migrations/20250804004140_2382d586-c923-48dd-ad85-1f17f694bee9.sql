-- Create storage bucket for organization backups
INSERT INTO storage.buckets (id, name, public) 
VALUES ('organization-backups', 'organization-backups', false);

-- Create policies for organization backup access
CREATE POLICY "Users can view their organization's backups" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'organization-backups' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can upload their organization's backups" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'organization-backups' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their organization's backups" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'organization-backups' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Create backup metadata table to track backup info
CREATE TABLE public.backup_metadata (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  backup_type TEXT NOT NULL DEFAULT 'scheduled',
  file_path TEXT NOT NULL,
  file_size BIGINT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by_user_id UUID REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'completed'
);

-- Enable RLS on backup metadata
ALTER TABLE public.backup_metadata ENABLE ROW LEVEL SECURITY;

-- Create policies for backup metadata
CREATE POLICY "Users can view their organization's backup metadata" 
ON public.backup_metadata 
FOR SELECT 
USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can create backup metadata for their organization" 
ON public.backup_metadata 
FOR INSERT 
WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "Users can delete their organization's backup metadata" 
ON public.backup_metadata 
FOR DELETE 
USING (organization_id = get_user_organization_id());

CREATE POLICY "Supervisors can manage all backup metadata" 
ON public.backup_metadata 
FOR ALL 
USING (is_supervisor());