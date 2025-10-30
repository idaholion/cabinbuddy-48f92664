-- Populate default FAQ items for all organizations
-- This inserts the default FAQ content for each organization

INSERT INTO public.faq_items (organization_id, category, question, answer, category_order, item_order)
SELECT 
  o.id as organization_id,
  faq.category,
  faq.question,
  faq.answer,
  faq.category_order,
  faq.item_order
FROM organizations o
CROSS JOIN (VALUES
  -- Getting Started (category_order: 1)
  ('Getting Started', 'What is Cabin Buddy?', 'Cabin Buddy is a comprehensive platform for managing shared cabin ownership. It helps families coordinate reservations, track expenses, manage work weekends, and communicate effectively.', 1, 1),
  ('Getting Started', 'How do I join my family''s organization?', 'Ask your group admin for an invitation link or organization code. Navigate to **Manage Organizations** from the sidebar and enter the code to join.', 1, 2),
  ('Getting Started', 'What are the different user roles?', 'There are three main roles: **Admin** (full management access), **Group Lead** (manages their family group), and **Member** (can make reservations and view information).', 1, 3),
  ('Getting Started', 'How do I set up my profile?', 'Click on your name in the sidebar, then select **Profile Settings**. You can update your name, email, phone number, and other preferences.', 1, 4),
  ('Getting Started', 'Can I belong to multiple organizations?', 'Yes! You can join multiple cabin organizations. Use the **Organization Switcher** at the top of the sidebar to switch between them.', 1, 5),
  ('Getting Started', 'What is a family group?', 'A family group represents a share-owning unit in your cabin. Each family group has members who can make reservations on behalf of the group.', 1, 6),
  
  -- Reservations & Calendar (category_order: 2)
  ('Reservations & Calendar', 'How do I make a reservation?', 'Go to **Cabin Calendar**, click on available dates, and fill out the booking form. You can select single or multiple periods depending on your organization''s settings.', 2, 1),
  ('Reservations & Calendar', 'What is the rotation order?', 'The rotation order determines which family group gets priority during the selection period. It typically rotates each year to ensure fairness.', 2, 2),
  ('Reservations & Calendar', 'When is the selection period?', 'Selection typically begins October 1st each year. Check your calendar''s status dropdown for current phase information and your family''s selection window.', 2, 3),
  ('Reservations & Calendar', 'What are primary and secondary selection periods?', '**Primary selection** is when families pick their main vacation weeks in rotation order. **Secondary selection** is when families can book additional available time, usually with a rolling selection window.', 2, 4),
  ('Reservations & Calendar', 'Can I extend my reservation?', 'Yes, if available dates are adjacent to your booking. Click on your reservation and select **Extend Selection** to add more days.', 2, 5),
  ('Reservations & Calendar', 'How do I cancel a reservation?', 'Click on your reservation in the calendar, then select **Delete Reservation**. Note: This may affect your selection usage depending on timing.', 2, 6),
  ('Reservations & Calendar', 'What is a trade request?', 'A trade request allows you to swap reservation periods with another family. Navigate to **Cabin Calendar** and use the trade feature to propose a swap.', 2, 7),
  ('Reservations & Calendar', 'Can guests make reservations?', 'If your organization has guest access enabled, guests can view the calendar and request reservations, which require admin approval.', 2, 8),
  
  -- Check-In & Check-Out (category_order: 3)
  ('Check-In & Check-Out', 'What are checklists?', 'Checklists are task lists for check-in and check-out procedures. They help ensure the cabin is properly maintained and ready for the next guests.', 3, 1),
  ('Check-In & Check-Out', 'How do I access my checklist?', 'Navigate to **Check-In** or **Checkout List** from the sidebar. Your active reservation''s checklist will be displayed.', 3, 2),
  ('Check-In & Check-Out', 'Can I customize checklists?', 'Admins can create and edit checklists in **Seasonal Checklists**. They can add tasks, images, and organize by season.', 3, 3),
  ('Check-In & Check-Out', 'What happens if I check out early?', 'Use the **Early Checkout** feature to adjust your billing. Navigate to your reservation and select the early checkout option.', 3, 4),
  ('Check-In & Check-Out', 'How do I report issues during my stay?', 'Use **Shared Notes** to document any problems or maintenance needs. This helps keep everyone informed about cabin conditions.', 3, 5),
  
  -- Financial Management (category_order: 4)
  ('Financial Management', 'How are use fees calculated?', 'Use fees are calculated based on the number of nights stayed multiplied by the nightly rate set by your organization''s admin.', 4, 1),
  ('Financial Management', 'Where can I view my payment history?', 'Navigate to **Financial Dashboard** to see your payment history, outstanding balances, and billing details.', 4, 2),
  ('Financial Management', 'What are recurring bills?', 'Recurring bills are regular expenses (like property taxes or utilities) that are split among all families. Admins manage these in **Financial Admin Tools**.', 4, 3),
  ('Financial Management', 'How do I record a payment?', 'Admins can record payments in the **Payment Tracker** section. Members will see updates reflected in their financial dashboard.', 4, 4),
  ('Financial Management', 'Can I export financial reports?', 'Yes, admins can export financial data from the **Admin Season Summary** page for tax purposes or record-keeping.', 4, 5),
  ('Financial Management', 'What is a billing cycle?', 'A billing cycle is the period over which use fees are calculated and invoiced. Your organization determines the billing schedule (monthly, quarterly, etc.).', 4, 6),
  ('Financial Management', 'How do guest costs work?', 'If enabled, guests pay a separate fee that can be tracked independently. Admins configure guest pricing in **Organization Settings**.', 4, 7),
  
  -- Features & Resources (category_order: 5)
  ('Features & Resources', 'What are work weekends?', 'Work weekends are designated times for cabin maintenance and improvements. Families can propose projects and sign up to help.', 5, 1),
  ('Features & Resources', 'How do I share photos?', 'Use the **Photo Sharing** feature to upload and share cabin memories with other families.', 5, 2),
  ('Features & Resources', 'What is the shopping list for?', 'The **Shopping List** helps coordinate supply purchases. Add items you notice are needed during your stay.', 5, 3),
  ('Features & Resources', 'Can I create shared notes?', 'Yes! **Shared Notes** allow you to document cabin information, maintenance issues, or helpful tips for other families.', 5, 4),
  ('Features & Resources', 'What are cabin rules?', '**Cabin Rules** document the agreed-upon guidelines for cabin use. Admins can update these and all members can view them.', 5, 5),
  ('Features & Resources', 'How do surveys and voting work?', 'Admins can create proposals for family voting on important decisions. Members vote through the **Family Voting** section.', 5, 6),
  ('Features & Resources', 'What are seasonal documents?', 'Seasonal documents provide guidance specific to different times of year, like winterization procedures or summer opening instructions.', 5, 7),
  ('Features & Resources', 'Can I integrate with Google Calendar?', 'Yes! Admins can set up Google Calendar sync in **Google Calendar Setup** to share cabin bookings with external calendars.', 5, 8),
  
  -- Account & Security (category_order: 6)
  ('Account & Security', 'How do I change my password?', 'Navigate to **Profile Settings** and select the option to update your password. You''ll receive a confirmation email.', 6, 1),
  ('Account & Security', 'Is my data secure?', 'Yes, Cabin Buddy uses industry-standard encryption and security practices. Your data is stored securely and never shared with third parties.', 6, 2),
  ('Account & Security', 'Can I update my phone number?', 'Yes, go to **Profile Settings** to update your phone number. This is important for receiving notifications and reminders.', 6, 3),
  ('Account & Security', 'How do notifications work?', 'You''ll receive notifications for important events like selection turn reminders, payment due dates, and work weekend announcements. Configure your preferences in settings.', 6, 4),
  ('Account & Security', 'What if I forget my password?', 'Click **Forgot Password** on the login page. You''ll receive an email with instructions to reset your password.', 6, 5),
  
  -- Troubleshooting (category_order: 7)
  ('Troubleshooting', 'Why can''t I see the calendar?', 'Make sure you''ve joined an organization and your admin has set up the rotation for the current year. Check your organization selection in the sidebar.', 7, 1),
  ('Troubleshooting', 'My reservation isn''t showing up. What should I do?', 'Try refreshing the page. If it still doesn''t appear, check your internet connection and ensure you selected the correct dates. Contact your admin if the issue persists.', 7, 2),
  ('Troubleshooting', 'I''m not receiving notifications. How do I fix this?', 'Check your profile settings to ensure your email and phone number are correct. Also verify that notification preferences are enabled.', 7, 3),
  ('Troubleshooting', 'Why can''t I make a reservation?', 'This could be due to: 1) It''s not your family''s selection turn, 2) You''ve reached your selection limit, 3) The dates are already booked, or 4) You don''t have the necessary permissions.', 7, 4),
  ('Troubleshooting', 'The app looks different. What changed?', 'We regularly update Cabin Buddy with new features and improvements. Check the version indicator in the sidebar footer to see your current version.', 7, 5),
  ('Troubleshooting', 'How do I report a bug?', 'Use the **Feedback** button at the bottom of the sidebar to report issues or suggest improvements.', 7, 6),
  
  -- Admin & Group Lead (category_order: 8)
  ('Admin & Group Lead', 'How do I add new family groups?', 'Navigate to **Family Group Setup** and click **Add Family Group**. Enter the family name and contact information.', 8, 1),
  ('Admin & Group Lead', 'How do I set up the rotation order?', 'Go to **Reservation Setup** to configure rotation order, selection periods, and booking rules for each year.', 8, 2),
  ('Admin & Group Lead', 'Can I customize use fees?', 'Yes, admins can set nightly rates and billing cycles in **Financial Settings** under Organization Settings.', 8, 3),
  ('Admin & Group Lead', 'How do I send payment reminders?', 'Use the **Financial Admin Tools** to send bulk payment reminders or individual notifications to families with outstanding balances.', 8, 4),
  ('Admin & Group Lead', 'What is the Admin Season Summary?', 'The **Admin Season Summary** provides a comprehensive overview of reservations, financials, and usage statistics for the year.', 8, 5),
  ('Admin & Group Lead', 'How do I manage user permissions?', 'In **Family Group Setup**, you can assign roles (Admin, Group Lead, Member) to control what each user can access and modify.', 8, 6),
  ('Admin & Group Lead', 'Can I export data for record-keeping?', 'Yes, several sections offer export functionality. Look for export buttons in Financial Dashboard, Admin Season Summary, and other admin tools.', 8, 7)
) AS faq(category, question, answer, category_order, item_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.faq_items 
  WHERE faq_items.organization_id = o.id
);