-- Add credit_applied_to_future column to payments table
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS credit_applied_to_future boolean DEFAULT false;

-- Add index for faster credit queries
CREATE INDEX IF NOT EXISTS idx_payments_credit_applied 
ON payments(organization_id, family_group, credit_applied_to_future) 
WHERE credit_applied_to_future = true AND balance_due < 0;

-- Add comment for documentation
COMMENT ON COLUMN payments.credit_applied_to_future IS 'Indicates if negative balance (credit) should be applied to future reservations';