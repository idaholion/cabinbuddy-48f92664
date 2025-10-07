-- Add payment adjustment and tracking columns
ALTER TABLE payments
ADD COLUMN IF NOT EXISTS manual_adjustment_amount NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS adjustment_notes TEXT,
ADD COLUMN IF NOT EXISTS billing_locked BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS daily_occupancy JSONB DEFAULT '[]'::jsonb;

-- Add index for faster season queries
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at);
CREATE INDEX IF NOT EXISTS idx_payments_organization_family ON payments(organization_id, family_group);