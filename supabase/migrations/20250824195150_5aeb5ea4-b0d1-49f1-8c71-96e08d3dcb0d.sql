-- Remove the restrictive check constraint to allow custom reminder types
ALTER TABLE public.reminder_templates DROP CONSTRAINT IF EXISTS reminder_templates_reminder_type_check;

-- Add basic templates using existing columns only
INSERT INTO public.reminder_templates (
  organization_id, 
  reminder_type, 
  subject_template, 
  custom_message, 
  checklist_items
) VALUES
(
  'f8882cbd-fc37-4521-bfd2-992dc8eb9a9f'::uuid,
  'seven_day',
  'Your Cabin Stay is Coming Up - {{check_in_date}}',
  E'Hi {{guest_name}},\n\nYour cabin stay is coming up in one week! Here are the details:\n\n**Stay Information:**\n• Check-in Date: {{check_in_date}}\n• Check-out Date: {{check_out_date}}\n• Family Group: {{family_group_name}}\n\nPlease review the cabin rules and prepare for your stay.\n\nBest regards,\n{{organization_name}} Team',
  '["Review cabin rules and guidelines", "Plan meals and grocery shopping", "Pack appropriate clothing for weather", "Confirm arrival time", "Review check-in procedures"]'::jsonb
),
(
  'f8882cbd-fc37-4521-bfd2-992dc8eb9a9f'::uuid,
  'three_day',
  'Cabin Stay This Week - {{check_in_date}}',
  E'Hi {{guest_name}},\n\nYour cabin stay is coming up in 3 days! Here\'s a quick reminder:\n\n**Stay Information:**\n• Check-in Date: {{check_in_date}}\n• Check-out Date: {{check_out_date}}\n• Family Group: {{family_group_name}}\n\nDon\'t forget to pack and review your check-in details.\n\nBest regards,\n{{organization_name}} Team',
  '["Finalize packing list", "Check weather forecast", "Confirm transportation", "Review cabin access details", "Plan first day activities"]'::jsonb
),
(
  'f8882cbd-fc37-4521-bfd2-992dc8eb9a9f'::uuid,
  'one_day',
  'Cabin Stay Tomorrow - Final Reminders',
  E'Hi {{guest_name}},\n\nYour cabin stay starts tomorrow! Here are some final reminders:\n\n**Stay Information:**\n• Check-in Date: {{check_in_date}}\n• Check-out Date: {{check_out_date}}\n• Family Group: {{family_group_name}}\n\nHave a wonderful stay!\n\nBest regards,\n{{organization_name}} Team',
  '["Pack all necessary items", "Confirm transportation arrangements", "Bring cabin keys/access codes", "Review emergency contact information", "Plan arrival time"]'::jsonb
),
(
  'f8882cbd-fc37-4521-bfd2-992dc8eb9a9f'::uuid,
  'work_weekend_reminder',
  'Work Weekend Coming Up - {{work_weekend_date}}',
  E'Hi {{participant_name}},\n\nThis is a reminder that we have a work weekend scheduled for {{work_weekend_date}}.\n\n**Work Weekend Details:**\n• Date: {{work_weekend_date}}\n• Start Time: {{start_time}}\n• Location: {{location}}\n• Coordinator: {{coordinator_name}}\n\nPlease confirm your attendance and review the task list.\n\nBest regards,\n{{organization_name}} Calendar Keeper',
  '["Confirm attendance with coordinator", "Review work weekend task list", "Bring appropriate work clothes and tools", "Check weather forecast", "Arrange transportation"]'::jsonb
);