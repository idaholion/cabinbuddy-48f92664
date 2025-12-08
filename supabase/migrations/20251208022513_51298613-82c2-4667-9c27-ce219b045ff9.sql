-- First fix the trigger function to not access amount_paid field directly
CREATE OR REPLACE FUNCTION public.update_payment_status()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Simply update timestamp - status updates happen through application logic
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Now fix the corrupted data
UPDATE payments SET amount = 70, amount_paid = 70 WHERE id = '66203962-c4f3-4352-b10d-205030d8ed3f';
UPDATE payments SET amount = 50, amount_paid = 50 WHERE id = 'f4092d46-7996-49cf-8ce1-4e07139d5b8c';

UPDATE payment_splits SET daily_occupancy_split = '[{"date": "2025-08-08", "sourceGuests": 6, "recipientGuests": 1, "perDiem": 10, "recipientCost": 10},{"date": "2025-08-09", "sourceGuests": 6, "recipientGuests": 1, "perDiem": 10, "recipientCost": 10},{"date": "2025-08-10", "sourceGuests": 6, "recipientGuests": 1, "perDiem": 10, "recipientCost": 10},{"date": "2025-08-11", "sourceGuests": 6, "recipientGuests": 1, "perDiem": 10, "recipientCost": 10},{"date": "2025-08-12", "sourceGuests": 6, "recipientGuests": 1, "perDiem": 10, "recipientCost": 10},{"date": "2025-08-13", "sourceGuests": 6, "recipientGuests": 1, "perDiem": 10, "recipientCost": 10},{"date": "2025-08-14", "sourceGuests": 6, "recipientGuests": 1, "perDiem": 10, "recipientCost": 10}]'::jsonb WHERE id = '3e85c6a2-8c89-4c52-ac84-69b21297bc05';

UPDATE payment_splits SET daily_occupancy_split = '[{"date": "2025-10-06", "sourceGuests": 5, "recipientGuests": 1, "perDiem": 10, "recipientCost": 10},{"date": "2025-10-07", "sourceGuests": 5, "recipientGuests": 1, "perDiem": 10, "recipientCost": 10},{"date": "2025-10-08", "sourceGuests": 5, "recipientGuests": 1, "perDiem": 10, "recipientCost": 10},{"date": "2025-10-09", "sourceGuests": 5, "recipientGuests": 1, "perDiem": 10, "recipientCost": 10},{"date": "2025-10-10", "sourceGuests": 5, "recipientGuests": 1, "perDiem": 10, "recipientCost": 10}]'::jsonb WHERE id = 'fdbe2c5c-5ab6-4b43-8aec-006a31568dc9';