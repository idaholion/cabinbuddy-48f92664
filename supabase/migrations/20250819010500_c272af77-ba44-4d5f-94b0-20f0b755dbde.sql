-- Add learn more fields to features table
ALTER TABLE public.features 
ADD COLUMN learn_more_text TEXT,
ADD COLUMN learn_more_url TEXT,
ADD COLUMN learn_more_type TEXT CHECK (learn_more_type IN ('text', 'internal_link', 'external_link')) DEFAULT NULL;