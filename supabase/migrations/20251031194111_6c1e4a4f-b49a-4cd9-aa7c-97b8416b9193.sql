-- Enable realtime for time_period_usage table
ALTER TABLE public.time_period_usage REPLICA IDENTITY FULL;

-- Add time_period_usage to realtime publication if not already added
DO $$ 
BEGIN
    -- Check if publication exists and add table to it
    IF EXISTS (
        SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
    ) THEN
        -- Add table to publication (will silently succeed if already added)
        ALTER PUBLICATION supabase_realtime ADD TABLE public.time_period_usage;
    END IF;
END $$;