-- Add progress tracking for interactive checklists
CREATE TABLE IF NOT EXISTS public.checklist_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  user_id UUID NOT NULL,
  checklist_id UUID NOT NULL,
  progress JSONB NOT NULL DEFAULT '{}',
  completed_items INTEGER DEFAULT 0,
  total_items INTEGER DEFAULT 0,
  last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE public.checklist_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own checklist progress"
ON public.checklist_progress
FOR ALL
USING (auth.uid() = user_id AND organization_id = get_user_organization_id())
WITH CHECK (auth.uid() = user_id AND organization_id = get_user_organization_id());

CREATE POLICY "Supervisors can manage all checklist progress"
ON public.checklist_progress
FOR ALL
USING (is_supervisor())
WITH CHECK (is_supervisor());

-- Add storage bucket for checklist images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('checklist-images', 'checklist-images', true)
ON CONFLICT (id) DO NOTHING;

-- Add storage policies for checklist images
CREATE POLICY "Users can upload their organization's checklist images"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'checklist-images' 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Anyone can view checklist images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'checklist-images');

CREATE POLICY "Users can update their organization's checklist images"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'checklist-images' 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Users can delete their organization's checklist images"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'checklist-images' 
  AND auth.uid() IS NOT NULL
);