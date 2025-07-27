-- Clear all user and organization data while keeping supervisors
-- This will allow you to start fresh with data input

-- Delete all organization-related data first (due to foreign key constraints)
DELETE FROM public.checkin_sessions;
DELETE FROM public.receipts; 
DELETE FROM public.survey_responses;
DELETE FROM public.custom_checklists;
DELETE FROM public.reservation_settings;
DELETE FROM public.family_groups;

-- Delete user-organization relationships
DELETE FROM public.user_organizations;

-- Delete user profiles
DELETE FROM public.profiles;

-- Delete all organizations
DELETE FROM public.organizations;

-- Note: Supervisors table is kept intact as requested
-- Note: auth.users table cannot be cleared via SQL - user must delete users from Supabase Auth dashboard