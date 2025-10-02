-- Remove the insecure public SELECT policy on trial_access_codes
DROP POLICY IF EXISTS "Anyone can validate unused trial codes" ON trial_access_codes;

-- Add secure policy: Only supervisors can view trial codes
CREATE POLICY "Supervisors can view all trial codes"
ON trial_access_codes
FOR SELECT
TO authenticated
USING (is_supervisor());

-- Add secure policy: Only supervisors can manage trial codes
CREATE POLICY "Supervisors can manage trial codes"
ON trial_access_codes
FOR ALL
TO authenticated
USING (is_supervisor())
WITH CHECK (is_supervisor());

-- The validate_trial_code and consume_trial_code RPC functions already exist
-- and are secure (SECURITY DEFINER functions that don't expose the table directly)
-- These functions will continue to work for code validation without exposing the table