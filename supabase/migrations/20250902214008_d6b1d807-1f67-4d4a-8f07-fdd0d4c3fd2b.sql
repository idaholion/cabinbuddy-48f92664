-- Create storage bucket for checklist images if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('checklist-images', 'checklist-images', true)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for checklist images
CREATE POLICY "Users can view checklist images in their organization" ON storage.objects
FOR SELECT USING (
  bucket_id = 'checklist-images' AND
  (storage.foldername(name))[1] IN (
    SELECT organization_id::text FROM user_organizations WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can upload checklist images to their organization" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'checklist-images' AND
  (storage.foldername(name))[1] IN (
    SELECT organization_id::text FROM user_organizations WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update checklist images in their organization" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'checklist-images' AND
  (storage.foldername(name))[1] IN (
    SELECT organization_id::text FROM user_organizations WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete checklist images in their organization" ON storage.objects
FOR DELETE USING (
  bucket_id = 'checklist-images' AND
  (storage.foldername(name))[1] IN (
    SELECT organization_id::text FROM user_organizations WHERE user_id = auth.uid()
  )
);