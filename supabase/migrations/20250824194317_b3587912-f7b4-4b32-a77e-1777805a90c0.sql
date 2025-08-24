-- Create reminder_templates table for storing custom notification templates
CREATE TABLE public.reminder_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  reminder_type TEXT NOT NULL,
  subject_template TEXT NOT NULL,
  custom_message TEXT NOT NULL,
  checklist_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  days_in_advance INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by_user_id UUID,
  
  -- Ensure unique reminder types per organization
  UNIQUE(organization_id, reminder_type)
);

-- Enable RLS
ALTER TABLE public.reminder_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for reminder_templates
CREATE POLICY "Users can view their organization's reminder templates"
ON public.reminder_templates FOR SELECT
USING (organization_id = get_user_organization_id());

CREATE POLICY "Calendar keepers and admins can manage reminder templates"
ON public.reminder_templates FOR ALL
USING (
  organization_id = get_user_organization_id() 
  AND (
    is_organization_admin() 
    OR EXISTS (
      SELECT 1 FROM organizations o 
      WHERE o.id = organization_id 
      AND o.calendar_keeper_email = get_current_user_email()
    )
  )
);

CREATE POLICY "Supervisors can manage all reminder templates"
ON public.reminder_templates FOR ALL
USING (is_supervisor());

-- Add updated_at trigger
CREATE TRIGGER update_reminder_templates_updated_at
  BEFORE UPDATE ON public.reminder_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add some default templates for common scenarios
INSERT INTO public.reminder_templates (
  organization_id, 
  reminder_type, 
  subject_template, 
  custom_message, 
  checklist_items, 
  days_in_advance,
  created_by_user_id
) 
SELECT 
  o.id as organization_id,
  'work_weekend_reminder',
  'Work Weekend Coming Up - {{work_weekend_date}}',
  E'Hi {{participant_name}},\n\nThis is a reminder that we have a work weekend scheduled for {{work_weekend_date}}.\n\n**Work Weekend Details:**\n• Date: {{work_weekend_date}}\n• Start Time: {{start_time}}\n• Location: {{location}}\n• Coordinator: {{coordinator_name}}\n\nPlease confirm your attendance and review the task list.\n\nBest regards,\n{{organization_name}} Calendar Keeper',
  '["Confirm attendance with coordinator", "Review work weekend task list", "Bring appropriate work clothes and tools", "Check weather forecast", "Arrange transportation"]'::jsonb,
  7,
  NULL
FROM organizations o
WHERE NOT EXISTS (
  SELECT 1 FROM reminder_templates rt 
  WHERE rt.organization_id = o.id 
  AND rt.reminder_type = 'work_weekend_reminder'
);

-- Add selection period templates
INSERT INTO public.reminder_templates (
  organization_id, 
  reminder_type, 
  subject_template, 
  custom_message, 
  checklist_items, 
  days_in_advance,
  created_by_user_id
) 
SELECT 
  o.id as organization_id,
  'selection_period_start',
  'Calendar Selection Period Now Open - {{selection_year}}',
  E'Hi {{guest_name}},\n\nThe calendar selection period for {{selection_year}} is now open! It\'s time to select your preferred cabin dates.\n\n**Selection Details:**\n• Your turn starts: {{selection_start_date}}\n• Selection deadline: {{selection_end_date}}\n• Available periods: {{available_periods}}\n\nPlease log into the system to make your selections as soon as possible.\n\nBest regards,\n{{organization_name}} Calendar Keeper',
  '["Review available time periods", "Coordinate with family group members", "Consider seasonal preferences and activities", "Submit selections before deadline", "Contact calendar keeper with any questions"]'::jsonb,
  0,
  NULL
FROM organizations o
WHERE NOT EXISTS (
  SELECT 1 FROM reminder_templates rt 
  WHERE rt.organization_id = o.id 
  AND rt.reminder_type = 'selection_period_start'
);