-- Remove duplicate templates, keeping the ones with the standard naming convention
DELETE FROM public.reminder_templates 
WHERE organization_id = 'f8882cbd-fc37-4521-bfd2-992dc8eb9a9f'::uuid
AND reminder_type IN ('stay_reminder_7_days', 'stay_reminder_1_day');

-- Ensure we have all the standard template types that might be expected
INSERT INTO public.reminder_templates (
  organization_id, 
  reminder_type, 
  subject_template, 
  custom_message, 
  checklist_items
) VALUES
-- Annual Meeting Reminder
(
  'f8882cbd-fc37-4521-bfd2-992dc8eb9a9f'::uuid,
  'annual_meeting',
  'Annual Meeting Reminder - {{meeting_date}}',
  E'Hi {{family_group_name}} family,\n\nThis is a reminder about our annual meeting scheduled for {{meeting_date}}.\n\n**Meeting Details:**\n• Date: {{meeting_date}}\n• Time: {{meeting_time}}\n• Location: {{meeting_location}}\n• Agenda: {{meeting_agenda}}\n\nPlease confirm your attendance.\n\nBest regards,\n{{organization_name}} Calendar Keeper',
  '["Review meeting agenda", "Prepare any questions or topics", "Confirm attendance with coordinator", "Review financial reports if applicable", "Plan transportation to meeting location"]'::jsonb
),
-- General Organization Reminder
(
  'f8882cbd-fc37-4521-bfd2-992dc8eb9a9f'::uuid,
  'general_reminder',
  'Important Reminder from {{organization_name}}',
  E'Hi {{recipient_name}},\n\nThis is an important reminder from {{organization_name}}.\n\n{{custom_content}}\n\nIf you have any questions, please don\'t hesitate to contact us.\n\nBest regards,\n{{organization_name}} Team',
  '["Review the information provided", "Take any required action", "Contact coordinator with questions", "Mark calendar if applicable", "Share with family group members if needed"]'::jsonb
),
-- Selection Deadline Reminder
(
  'f8882cbd-fc37-4521-bfd2-992dc8eb9a9f'::uuid,
  'selection_deadline',
  'Selection Deadline Approaching - {{deadline_date}}',
  E'Hi {{family_group_name}} family,\n\nThis is a reminder that the selection deadline for {{selection_year}} is approaching.\n\n**Important Details:**\n• Deadline: {{deadline_date}}\n• Current Status: {{selection_status}}\n• Remaining Time: {{time_remaining}}\n\nPlease complete your selections as soon as possible.\n\nBest regards,\n{{organization_name}} Calendar Keeper',
  '["Review available time periods", "Finalize family group selections", "Submit selections before deadline", "Coordinate with family members", "Contact calendar keeper if assistance needed"]'::jsonb
)
ON CONFLICT (organization_id, reminder_type) DO NOTHING;