-- Add rotation configuration fields to rotation_orders table
ALTER TABLE public.rotation_orders 
ADD COLUMN max_time_slots INTEGER,
ADD COLUMN max_nights INTEGER,
ADD COLUMN start_day TEXT,
ADD COLUMN start_time TEXT,
ADD COLUMN first_last_option TEXT;