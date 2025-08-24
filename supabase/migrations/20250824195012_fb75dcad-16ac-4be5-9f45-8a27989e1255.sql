-- Add default reminder templates for the organization
INSERT INTO public.reminder_templates (
  organization_id, 
  reminder_type, 
  subject_template, 
  custom_message, 
  checklist_items
) VALUES 
-- Work weekend reminder
(
  'f8882cbd-fc37-4521-bfd2-992dc8eb9a9f'::uuid,
  'work_weekend_reminder',
  'Work Weekend Coming Up - {{work_weekend_date}}',
  E'Hi {{participant_name}},\n\nThis is a reminder that we have a work weekend scheduled for {{work_weekend_date}}.\n\n**Work Weekend Details:**\n• Date: {{work_weekend_date}}\n• Start Time: {{start_time}}\n• Location: {{location}}\n• Coordinator: {{coordinator_name}}\n\nPlease confirm your attendance and review the task list.\n\nBest regards,\n{{organization_name}} Calendar Keeper',
  '["Confirm attendance with coordinator", "Review work weekend task list", "Bring appropriate work clothes and tools", "Check weather forecast", "Arrange transportation"]'::jsonb
),
-- Selection period start
(
  'f8882cbd-fc37-4521-bfd2-992dc8eb9a9f'::uuid,
  'selection_period_start',
  'Calendar Selection Period Now Open - {{selection_year}}',
  E'Hi {{guest_name}},\n\nThe calendar selection period for {{selection_year}} is now open! It\'s time to select your preferred cabin dates.\n\n**Selection Details:**\n• Your turn starts: {{selection_start_date}}\n• Selection deadline: {{selection_end_date}}\n• Available periods: {{available_periods}}\n\nPlease log into the system to make your selections as soon as possible.\n\nBest regards,\n{{organization_name}} Calendar Keeper',
  '["Review available time periods", "Coordinate with family group members", "Consider seasonal preferences and activities", "Submit selections before deadline", "Contact calendar keeper with any questions"]'::jsonb
),
-- 7-day stay reminder
(
  'f8882cbd-fc37-4521-bfd2-992dc8eb9a9f'::uuid,
  'stay_reminder_7_days',
  'Your Cabin Stay is Coming Up - {{check_in_date}}',
  E'Hi {{guest_name}},\n\nYour cabin stay is coming up in one week! Here are the details:\n\n**Stay Information:**\n• Check-in Date: {{check_in_date}}\n• Check-out Date: {{check_out_date}}\n• Family Group: {{family_group_name}}\n\nPlease review the cabin rules and prepare for your stay.\n\nBest regards,\n{{organization_name}} Team',
  '["Review cabin rules and guidelines", "Plan meals and grocery shopping", "Pack appropriate clothing for weather", "Confirm arrival time", "Review check-in procedures"]'::jsonb
),
-- 1-day stay reminder
(
  'f8882cbd-fc37-4521-bfd2-992dc8eb9a9f'::uuid,
  'stay_reminder_1_day',
  'Cabin Stay Tomorrow - Final Reminders',
  E'Hi {{guest_name}},\n\nYour cabin stay starts tomorrow! Here are some final reminders:\n\n**Stay Information:**\n• Check-in Date: {{check_in_date}}\n• Check-out Date: {{check_out_date}}\n• Family Group: {{family_group_name}}\n\nHave a wonderful stay!\n\nBest regards,\n{{organization_name}} Team',
  '["Pack all necessary items", "Confirm transportation arrangements", "Bring cabin keys/access codes", "Review emergency contact information", "Plan arrival time"]'::jsonb
)
ON CONFLICT (organization_id, reminder_type) DO NOTHING;