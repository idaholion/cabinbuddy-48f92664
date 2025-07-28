-- Add host assignment functionality to reservations
-- Add a new column to store host assignments for each reservation
ALTER TABLE public.reservations 
ADD COLUMN host_assignments jsonb DEFAULT '[]'::jsonb;

-- The host_assignments will store an array of objects like:
-- [
--   {
--     "host_name": "John Doe",
--     "host_email": "john@example.com", 
--     "start_date": "2025-01-10",
--     "end_date": "2025-01-14"
--   },
--   {
--     "host_name": "Jane Doe",
--     "host_email": "jane@example.com",
--     "start_date": "2025-01-15", 
--     "end_date": "2025-01-17"
--   }
-- ]

-- Add index for efficient querying of host assignments
CREATE INDEX idx_reservations_host_assignments ON public.reservations USING gin(host_assignments);