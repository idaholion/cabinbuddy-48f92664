-- Add enable_post_rotation_selection column to rotation_orders table
ALTER TABLE public.rotation_orders 
ADD COLUMN enable_post_rotation_selection boolean DEFAULT false;