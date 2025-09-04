-- Add image_sizes column to checklist_progress table for storing image size preferences
ALTER TABLE checklist_progress 
ADD COLUMN image_sizes jsonb DEFAULT '{}'::jsonb;