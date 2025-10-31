-- Enable realtime for secondary_selection_status table
ALTER TABLE public.secondary_selection_status REPLICA IDENTITY FULL;

-- Add table to realtime publication if not already added
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'secondary_selection_status'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.secondary_selection_status;
  END IF;
END $$;