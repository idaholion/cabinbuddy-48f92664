-- Create storage bucket for shared checklist images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('checklist-images', 'checklist-images', true);

-- Create policies for checklist images bucket
CREATE POLICY "Checklist images are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'checklist-images');

CREATE POLICY "Authenticated users can upload checklist images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'checklist-images' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update their own checklist images" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'checklist-images' AND auth.role() = 'authenticated');

CREATE POLICY "Users can delete their own checklist images" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'checklist-images' AND auth.role() = 'authenticated');