-- Extend checklists table to support images
ALTER TABLE checklists ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]'::jsonb;

-- Create storage bucket for checklist images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('checklist-images', 'checklist-images', true)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for checklist images bucket
CREATE POLICY "Users can view checklist images" ON storage.objects
FOR SELECT USING (bucket_id = 'checklist-images');

CREATE POLICY "Authenticated users can upload checklist images" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'checklist-images' AND 
  auth.uid() IS NOT NULL
);

CREATE POLICY "Users can update their organization's checklist images" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'checklist-images' AND 
  auth.uid() IS NOT NULL
);

CREATE POLICY "Users can delete their organization's checklist images" ON storage.objects
FOR DELETE USING (
  bucket_id = 'checklist-images' AND 
  auth.uid() IS NOT NULL
);