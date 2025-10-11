-- Delete orphaned payment with no reservation link
DELETE FROM payments 
WHERE id = '1b4c6739-d493-40a1-9976-593707ff67a1'
  AND reservation_id IS NULL
  AND amount = 75;