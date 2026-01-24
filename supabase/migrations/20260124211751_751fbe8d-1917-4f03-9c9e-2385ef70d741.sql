-- Mark the old Grandy Family reservation period as complete since dates have passed
UPDATE reservation_periods 
SET reservations_completed = true, updated_at = now()
WHERE id = '1bd45cc5-55c4-401b-a143-a5f4b1d52620';