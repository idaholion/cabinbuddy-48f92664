-- Add start_month column to rotation_orders table
ALTER TABLE public.rotation_orders 
ADD COLUMN start_month TEXT;