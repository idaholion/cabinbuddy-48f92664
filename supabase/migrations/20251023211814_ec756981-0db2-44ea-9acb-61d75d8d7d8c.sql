-- Add turn_completed flag to time_period_usage table
-- This tracks whether a family has explicitly completed their turn vs just reaching their limit
ALTER TABLE time_period_usage 
ADD COLUMN IF NOT EXISTS turn_completed BOOLEAN DEFAULT false;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_time_period_usage_turn_completed 
ON time_period_usage(organization_id, rotation_year, turn_completed);

-- Create function to reset turn_completed when a new rotation year starts
CREATE OR REPLACE FUNCTION reset_turn_completed_for_new_year()
RETURNS TRIGGER AS $$
BEGIN
  -- When inserting a new rotation year's usage records, ensure turn_completed is false
  IF NEW.turn_completed IS NULL THEN
    NEW.turn_completed := false;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to ensure turn_completed is properly initialized
DROP TRIGGER IF EXISTS ensure_turn_completed_default ON time_period_usage;
CREATE TRIGGER ensure_turn_completed_default
BEFORE INSERT ON time_period_usage
FOR EACH ROW
EXECUTE FUNCTION reset_turn_completed_for_new_year();