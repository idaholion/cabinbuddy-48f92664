-- Fix incorrect status where balance_due > 0 but status is 'paid'
UPDATE payments
SET status = (CASE 
    WHEN amount_paid > 0 AND balance_due > 0 THEN 'partial'
    WHEN amount_paid = 0 AND balance_due > 0 THEN 'pending'
    ELSE status::text
  END)::payment_status,
  updated_at = now()
WHERE balance_due > 0 
  AND status = 'paid';

-- Also ensure correct status for all records based on actual amounts
UPDATE payments
SET status = (CASE 
    WHEN balance_due <= 0 OR amount_paid >= amount THEN 'paid'
    WHEN amount_paid > 0 THEN 'partial'
    ELSE 'pending'
  END)::payment_status,
  updated_at = now()
WHERE status NOT IN ('cancelled', 'refunded');