-- Fix: The amount field must include all charges since balance_due = amount - amount_paid (generated column).
-- Previously amount was $530 with a redundant $390 manual_adjustment (double-counting).
-- We incorrectly changed amount to $140 which broke balance_due.
-- Correct fix: restore amount to $530 (total owed) and zero out the manual_adjustment to stop double-counting.
UPDATE payments 
SET amount = 530.00, 
    manual_adjustment_amount = 0, 
    adjustment_notes = NULL
WHERE id = '1c8882fc-1c24-45fd-a6df-6277682a0aad' 
AND family_group = 'Grandy Family';