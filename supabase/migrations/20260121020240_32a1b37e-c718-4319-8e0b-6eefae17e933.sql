-- Fix payments where balance_due is 0 or less but status is still pending/partial
UPDATE payments
SET status = 'paid',
    updated_at = now()
WHERE balance_due <= 0 
  AND status NOT IN ('paid', 'cancelled', 'refunded');

-- Also fix any payments where amount_paid >= amount but status wasn't updated
UPDATE payments
SET status = 'paid',
    updated_at = now()
WHERE amount_paid >= amount
  AND amount > 0
  AND status NOT IN ('paid', 'cancelled', 'refunded');