-- Add RLS policies for the documents storage bucket to ensure proper access
INSERT INTO storage.objects (bucket_id, name, owner, created_at, updated_at, last_accessed_at, metadata)
SELECT 'documents', '', null, now(), now(), now(), '{}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM storage.objects WHERE bucket_id = 'documents' LIMIT 1)
ON CONFLICT DO NOTHING;

-- Create policy for authenticated users to read documents in their organization
CREATE POLICY IF NOT EXISTS "Users can view their organization's documents" ON storage.objects
FOR SELECT USING (
  bucket_id = 'documents' AND
  auth.uid() IS NOT NULL AND
  (storage.foldername(name))[1] IN (
    SELECT organization_id::text FROM user_organizations 
    WHERE user_id = auth.uid()
  )
);

-- Create policy for authenticated users to insert documents in their organization  
CREATE POLICY IF NOT EXISTS "Users can upload documents to their organization" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'documents' AND
  auth.uid() IS NOT NULL AND
  (storage.foldername(name))[1] IN (
    SELECT organization_id::text FROM user_organizations 
    WHERE user_id = auth.uid()
  )
);

-- Create policy for authenticated users to delete their own documents
CREATE POLICY IF NOT EXISTS "Users can delete their own documents" ON storage.objects
FOR DELETE USING (
  bucket_id = 'documents' AND
  auth.uid() IS NOT NULL AND
  (storage.foldername(name))[1] IN (
    SELECT organization_id::text FROM user_organizations 
    WHERE user_id = auth.uid()
  )
);

-- Create policy for authenticated users to update their own documents
CREATE POLICY IF NOT EXISTS "Users can update their own documents" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'documents' AND
  auth.uid() IS NOT NULL AND
  (storage.foldername(name))[1] IN (
    SELECT organization_id::text FROM user_organizations 
    WHERE user_id = auth.uid()
  )
);