-- Add missing organization_id column to checklist_progress table
ALTER TABLE public.checklist_progress 
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);

-- For existing rows, we'll need to populate organization_id some other way since session_id doesn't exist
-- For now, let's just add the column and existing progress will need to be re-created