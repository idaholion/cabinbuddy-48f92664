-- Add automated selection turn notifications toggle to organizations
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS automated_selection_turn_notifications_enabled BOOLEAN DEFAULT false;

-- Create table to track sent notifications to prevent duplicates
CREATE TABLE IF NOT EXISTS selection_turn_notifications_sent (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  rotation_year integer NOT NULL,
  family_group text NOT NULL,
  phase text NOT NULL CHECK (phase IN ('primary', 'secondary')),
  sent_at timestamptz DEFAULT now(),
  UNIQUE(organization_id, rotation_year, family_group, phase)
);

-- Add index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_selection_turn_notifications_org_year 
ON selection_turn_notifications_sent(organization_id, rotation_year);

-- Enable RLS
ALTER TABLE selection_turn_notifications_sent ENABLE ROW LEVEL SECURITY;

-- Users can view notifications for their organization
CREATE POLICY "Users can view notifications for their organization"
ON selection_turn_notifications_sent
FOR SELECT
USING (
  validate_organization_access(organization_id, 'view_selection_notifications')
);

-- Service role can manage all notifications
CREATE POLICY "Service role can manage notifications"
ON selection_turn_notifications_sent
FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role');