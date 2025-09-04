-- Add missing organization_id column to checklist_progress table
ALTER TABLE public.checklist_progress 
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);

-- Update existing rows to set organization_id based on the session's organization
UPDATE public.checklist_progress 
SET organization_id = (
  SELECT organization_id 
  FROM checkin_sessions 
  WHERE checkin_sessions.id = checklist_progress.session_id
)
WHERE organization_id IS NULL;