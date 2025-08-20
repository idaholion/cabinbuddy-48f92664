-- Drop existing policies if they exist and recreate them
DROP POLICY IF EXISTS "Users can view their organization's documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload documents to their organization" ON storage.objects;  
DROP POLICY IF EXISTS "Users can delete their own documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own documents" ON storage.objects;

-- Create policy for authenticated users to read documents in their organization
CREATE POLICY "Users can view their organization's documents" ON storage.objects
FOR SELECT USING (
  bucket_id = 'documents' AND
  auth.uid() IS NOT NULL AND
  (storage.foldername(name))[1] IN (
    SELECT organization_id::text FROM user_organizations 
    WHERE user_id = auth.uid()
  )
);

-- Create policy for authenticated users to insert documents in their organization  
CREATE POLICY "Users can upload documents to their organization" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'documents' AND
  auth.uid() IS NOT NULL AND
  (storage.foldername(name))[1] IN (
    SELECT organization_id::text FROM user_organizations 
    WHERE user_id = auth.uid()
  )
);

-- Create policy for authenticated users to delete their own documents
CREATE POLICY "Users can delete their own documents" ON storage.objects
FOR DELETE USING (
  bucket_id = 'documents' AND
  auth.uid() IS NOT NULL AND
  (storage.foldername(name))[1] IN (
    SELECT organization_id::text FROM user_organizations 
    WHERE user_id = auth.uid()
  )
);

-- Create policy for authenticated users to update their own documents
CREATE POLICY "Users can update their own documents" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'documents' AND
  auth.uid() IS NOT NULL AND
  (storage.foldername(name))[1] IN (
    SELECT organization_id::text FROM user_organizations 
    WHERE user_id = auth.uid()
  )
);