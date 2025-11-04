-- Phase 1: Add allocation_model tracking and safety audit table

-- Add allocation_model column to track the booking system type
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS allocation_model TEXT DEFAULT 'rotating_selection',
ADD COLUMN IF NOT EXISTS is_test_organization BOOLEAN DEFAULT false;

-- Add check constraint to ensure valid allocation models
ALTER TABLE organizations 
ADD CONSTRAINT organizations_allocation_model_check 
CHECK (allocation_model IN ('rotating_selection', 'static_weeks', 'first_come_first_serve', 'manual', 'lottery'));

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_organizations_allocation_model 
ON organizations(allocation_model);

-- Explicitly set Andrew Cabin as rotating selection (PRODUCTION)
UPDATE organizations 
SET allocation_model = 'rotating_selection',
    is_test_organization = false
WHERE name ILIKE '%andrew%';

-- Add helpful comments
COMMENT ON COLUMN organizations.allocation_model IS 'Defines time allocation system: rotating_selection (Group Order Rotates), static_weeks (Fixed Weeks), etc. Changing this affects core booking logic.';
COMMENT ON COLUMN organizations.is_test_organization IS 'TRUE for test/demo organizations. Production orgs must be FALSE.';

-- Create audit table to track allocation model changes
CREATE TABLE IF NOT EXISTS allocation_model_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  old_model TEXT,
  new_model TEXT,
  changed_by_user_id UUID,
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  change_reason TEXT,
  approved_by TEXT
);

-- Enable RLS on audit table
ALTER TABLE allocation_model_audit ENABLE ROW LEVEL SECURITY;

-- Only supervisors can view allocation model changes
CREATE POLICY "Only supervisors can view allocation model changes"
  ON allocation_model_audit FOR SELECT
  USING (is_supervisor());

-- Only system can log allocation model changes
CREATE POLICY "Only system can log allocation model changes"
  ON allocation_model_audit FOR INSERT
  WITH CHECK (
    (((current_setting('request.jwt.claims'::text, true))::json ->> 'role'::text) = 'service_role'::text) 
    OR is_supervisor()
  );

-- Create trigger to automatically log allocation model changes
CREATE OR REPLACE FUNCTION log_allocation_model_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log if allocation_model actually changed
  IF (OLD.allocation_model IS DISTINCT FROM NEW.allocation_model) THEN
    INSERT INTO allocation_model_audit (
      organization_id,
      old_model,
      new_model,
      changed_by_user_id,
      change_reason
    ) VALUES (
      NEW.id,
      OLD.allocation_model,
      NEW.allocation_model,
      auth.uid(),
      'Allocation model changed via application'
    );
    
    -- If production org, also log to emergency access log for extra visibility
    IF NEW.is_test_organization = false THEN
      INSERT INTO emergency_access_log (
        organization_id,
        user_id,
        action_type,
        reason,
        details
      ) VALUES (
        NEW.id,
        auth.uid(),
        'ALLOCATION_MODEL_CHANGE',
        'Production organization allocation model modified',
        jsonb_build_object(
          'old_model', OLD.allocation_model,
          'new_model', NEW.allocation_model,
          'organization_name', NEW.name
        )
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS tr_log_allocation_model_change ON organizations;
CREATE TRIGGER tr_log_allocation_model_change
  AFTER UPDATE ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION log_allocation_model_change();