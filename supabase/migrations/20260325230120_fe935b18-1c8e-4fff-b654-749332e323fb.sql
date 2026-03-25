-- Fix balance_due generated column to include manual_adjustment_amount
ALTER TABLE payments 
DROP COLUMN balance_due;

ALTER TABLE payments 
ADD COLUMN balance_due numeric 
GENERATED ALWAYS AS (amount + COALESCE(manual_adjustment_amount, 0) - COALESCE(amount_paid, 0)) STORED;

-- Restore the separate line item display for Grandy's rollover
UPDATE payments 
SET amount = 140.00, 
    manual_adjustment_amount = 390, 
    adjustment_notes = 'Rollover owed for 2024'
WHERE id = '1c8882fc-1c24-45fd-a6df-6277682a0aad';