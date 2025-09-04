-- Add introductory_text column to custom_checklists table
ALTER TABLE public.custom_checklists 
ADD COLUMN introductory_text TEXT;