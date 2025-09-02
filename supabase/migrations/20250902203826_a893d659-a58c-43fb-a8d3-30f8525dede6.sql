-- Update the custom_checklists table to support additional checklist types
-- Remove the existing constraint and add a new one that includes seasonal types

ALTER TABLE custom_checklists DROP CONSTRAINT IF EXISTS custom_checklists_checklist_type_check;

ALTER TABLE custom_checklists ADD CONSTRAINT custom_checklists_checklist_type_check 
CHECK (checklist_type IN ('arrival', 'daily', 'closing', 'opening', 'seasonal', 'maintenance'));

-- Update the checkin_sessions table to support these new session types as well
ALTER TABLE checkin_sessions DROP CONSTRAINT IF EXISTS checkin_sessions_session_type_check;

ALTER TABLE checkin_sessions ADD CONSTRAINT checkin_sessions_session_type_check 
CHECK (session_type IN ('arrival', 'daily', 'closing', 'opening', 'seasonal', 'maintenance'));