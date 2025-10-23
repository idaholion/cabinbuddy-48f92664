-- Add turn_completed flag to secondary_selection_status table
-- This prevents auto-advancement in the secondary selection phase
ALTER TABLE secondary_selection_status 
ADD COLUMN IF NOT EXISTS turn_completed BOOLEAN DEFAULT false;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_secondary_selection_turn_completed 
ON secondary_selection_status(organization_id, rotation_year, turn_completed);

-- Update existing records to have turn_completed = false
UPDATE secondary_selection_status 
SET turn_completed = false 
WHERE turn_completed IS NULL;