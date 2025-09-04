-- Create storage bucket for checklist images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('checklist-images', 'checklist-images', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for checklist images
CREATE POLICY "Users can view checklist images" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'checklist-images');

CREATE POLICY "Users can upload checklist images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'checklist-images' 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Users can update their organization's checklist images" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'checklist-images' 
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] IN (
    SELECT get_user_organization_id()::text
  )
);

CREATE POLICY "Users can delete their organization's checklist images" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'checklist-images' 
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] IN (
    SELECT get_user_organization_id()::text
  )
);