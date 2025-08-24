-- Add sort_order column to reminder_templates table
ALTER TABLE public.reminder_templates 
ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0;

-- Update the sort order of reminder templates to match the requested order
UPDATE public.reminder_templates 
SET sort_order = CASE reminder_type
  WHEN 'seven_day' THEN 1
  WHEN 'three_day' THEN 2
  WHEN 'one_day' THEN 3
  WHEN 'selection_period_start' THEN 4
  WHEN 'selection_deadline' THEN 5
  WHEN 'work_weekend_reminder' THEN 6
  WHEN 'annual_meeting' THEN 7
  WHEN 'general_reminder' THEN 8
  ELSE 99
END
WHERE organization_id = 'f8882cbd-fc37-4521-bfd2-992dc8eb9a9f'::uuid;