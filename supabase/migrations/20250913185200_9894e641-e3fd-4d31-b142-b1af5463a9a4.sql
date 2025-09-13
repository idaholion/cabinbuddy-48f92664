-- Remove supervisor-related columns from work_weekends table
ALTER TABLE work_weekends 
DROP COLUMN IF EXISTS supervisor_approved_at,
DROP COLUMN IF EXISTS supervisor_approved_by;

-- Update any existing work weekends that are stuck in supervisor_approved status
UPDATE work_weekends 
SET status = 'proposed'
WHERE status = 'supervisor_approved';

-- Fix work weekends that have no conflicts but are still in proposed status
-- These should be immediately approved
UPDATE work_weekends 
SET status = 'fully_approved',
    fully_approved_at = now()
WHERE status = 'proposed' 
  AND (conflict_reservations IS NULL OR jsonb_array_length(conflict_reservations) = 0);