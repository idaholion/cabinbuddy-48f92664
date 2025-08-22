-- Enable real-time updates for recurring_bills table
ALTER TABLE public.recurring_bills REPLICA IDENTITY FULL;

-- Add recurring_bills to the realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.recurring_bills;