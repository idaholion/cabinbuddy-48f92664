-- Create payment_splits table to track cost splits between users
CREATE TABLE payment_splits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  source_payment_id uuid NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  split_payment_id uuid NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  source_family_group text NOT NULL,
  source_user_id uuid NOT NULL,
  split_to_family_group text NOT NULL,
  split_to_user_id uuid NOT NULL,
  daily_occupancy_split jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by_user_id uuid NOT NULL,
  notification_sent_at timestamp with time zone,
  notification_status text NOT NULL DEFAULT 'pending',
  status text NOT NULL DEFAULT 'active',
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE payment_splits ENABLE ROW LEVEL SECURITY;

-- Users can view splits for their organization
CREATE POLICY "Users can view their organization's splits"
  ON payment_splits FOR SELECT
  USING (organization_id = get_user_organization_id());

-- Users can create splits for payments in their organization
CREATE POLICY "Users can create splits"
  ON payment_splits FOR INSERT
  WITH CHECK (
    organization_id = get_user_organization_id() 
    AND created_by_user_id = auth.uid()
  );

-- Users can update splits they created
CREATE POLICY "Users can update their splits"
  ON payment_splits FOR UPDATE
  USING (
    organization_id = get_user_organization_id() 
    AND created_by_user_id = auth.uid()
  );

-- Supervisors can manage all splits
CREATE POLICY "Supervisors can manage all splits"
  ON payment_splits FOR ALL
  USING (is_supervisor());

-- Add indexes for performance
CREATE INDEX idx_payment_splits_source ON payment_splits(source_payment_id);
CREATE INDEX idx_payment_splits_split ON payment_splits(split_payment_id);
CREATE INDEX idx_payment_splits_org ON payment_splits(organization_id);
CREATE INDEX idx_payment_splits_split_to_user ON payment_splits(split_to_user_id);
CREATE INDEX idx_payment_splits_created_by ON payment_splits(created_by_user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_payment_splits_updated_at
  BEFORE UPDATE ON payment_splits
  FOR EACH ROW
  EXECUTE FUNCTION update_payment_status();