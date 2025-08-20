-- Create RLS policies for receipt-images storage bucket
-- Users can view their own receipt images
CREATE POLICY "Users can view their own receipt images"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'receipt-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can upload their own receipt images  
CREATE POLICY "Users can upload their own receipt images"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'receipt-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can delete their own receipt images
CREATE POLICY "Users can delete their own receipt images"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'receipt-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);