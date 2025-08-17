-- Fix critical security issue: Enable RLS on tables that have policies but RLS disabled

-- Check and enable RLS on family_groups table (contains sensitive contact information)
ALTER TABLE public.family_groups ENABLE ROW LEVEL SECURITY;

-- Check and enable RLS on profiles table if it exists and has policies
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
    ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Ensure RLS is enabled on all critical tables that should have it
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rotation_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkin_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_period_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trade_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trade_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_keeper_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seasonal_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.photo_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopping_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservation_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.secondary_selection_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminder_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_group_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_share_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_voting_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cabin_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backup_metadata ENABLE ROW LEVEL SECURITY;

-- Create profiles table with proper RLS if it doesn't exist
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid not null references auth.users on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  first_name text,
  last_name text,
  display_name text,
  email text,
  phone text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  primary key (id)
);

-- Enable RLS on profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create secure RLS policies for profiles if they don't exist
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id OR auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;  
CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id OR auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id OR auth.uid() = id);

DROP POLICY IF EXISTS "Supervisors can manage all profiles" ON public.profiles;
CREATE POLICY "Supervisors can manage all profiles" ON public.profiles
  FOR ALL USING (is_supervisor());

-- Add trigger for profiles table updates
CREATE OR REPLACE FUNCTION public.update_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_profiles_updated_at();