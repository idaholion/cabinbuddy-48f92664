-- Create documents storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) 
VALUES (
  'documents', 
  'documents', 
  true, 
  10485760, -- 10MB limit
  ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'image/jpeg', 'image/png', 'image/jpg']
);

-- Create RLS policies for documents bucket
CREATE POLICY "Organization members can view documents" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'documents' AND 
  EXISTS (
    SELECT 1 FROM organization_users ou 
    WHERE ou.user_id = auth.uid() 
    AND ou.organization_id::text = split_part(name, '/', 1)
  )
);

CREATE POLICY "Supervisors can upload documents" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'documents' AND 
  EXISTS (
    SELECT 1 FROM organization_users ou 
    WHERE ou.user_id = auth.uid() 
    AND ou.organization_id::text = split_part(name, '/', 1)
    AND ou.role IN ('supervisor', 'admin')
  )
);

CREATE POLICY "Supervisors can update documents" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'documents' AND 
  EXISTS (
    SELECT 1 FROM organization_users ou 
    WHERE ou.user_id = auth.uid() 
    AND ou.organization_id::text = split_part(name, '/', 1)
    AND ou.role IN ('supervisor', 'admin')
  )
);

CREATE POLICY "Supervisors can delete documents" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'documents' AND 
  EXISTS (
    SELECT 1 FROM organization_users ou 
    WHERE ou.user_id = auth.uid() 
    AND ou.organization_id::text = split_part(name, '/', 1)
    AND ou.role IN ('supervisor', 'admin')
  )
);