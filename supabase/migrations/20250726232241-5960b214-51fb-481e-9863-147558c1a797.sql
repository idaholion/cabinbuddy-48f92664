-- Create organizations table
CREATE TABLE public.organizations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  admin_name TEXT,
  admin_email TEXT,
  admin_phone TEXT,
  treasurer_name TEXT,
  treasurer_email TEXT,
  treasurer_phone TEXT,
  calendar_keeper_name TEXT,
  calendar_keeper_email TEXT,
  calendar_keeper_phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Update profiles table to include organization_id FIRST
ALTER TABLE public.profiles ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL;

-- Create security definer function to get user's organization AFTER adding column
CREATE OR REPLACE FUNCTION public.get_user_organization_id()
RETURNS UUID
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT organization_id FROM public.profiles WHERE user_id = auth.uid();
$$;

-- Create family groups table
CREATE TABLE public.family_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  lead_name TEXT,
  lead_phone TEXT,
  lead_email TEXT,
  host_members TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create reservation settings table
CREATE TABLE public.reservation_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  property_name TEXT,
  address TEXT,
  bedrooms INTEGER,
  bathrooms INTEGER,
  max_guests INTEGER,
  nightly_rate DECIMAL(10,2),
  cleaning_fee DECIMAL(10,2),
  pet_fee DECIMAL(10,2),
  damage_deposit DECIMAL(10,2),
  financial_method TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create custom checklists table
CREATE TABLE public.custom_checklists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  checklist_type TEXT NOT NULL, -- 'arrival' or 'daily'
  items JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create check-in sessions table
CREATE TABLE public.checkin_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_type TEXT NOT NULL, -- 'arrival' or 'daily'
  check_date DATE NOT NULL,
  family_group TEXT,
  guest_names TEXT[],
  checklist_responses JSONB NOT NULL DEFAULT '{}',
  notes TEXT,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create survey responses table
CREATE TABLE public.survey_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  family_group TEXT,
  responses JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create receipts table
CREATE TABLE public.receipts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  family_group TEXT,
  description TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  date DATE NOT NULL,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservation_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkin_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for organizations
CREATE POLICY "Users can view their organization" 
ON public.organizations 
FOR SELECT 
USING (id = public.get_user_organization_id());

CREATE POLICY "Users can update their organization" 
ON public.organizations 
FOR UPDATE 
USING (id = public.get_user_organization_id());

CREATE POLICY "Users can create organizations" 
ON public.organizations 
FOR INSERT 
WITH CHECK (true);

-- RLS Policies for family_groups
CREATE POLICY "Users can view their organization's family groups" 
ON public.family_groups 
FOR SELECT 
USING (organization_id = public.get_user_organization_id());

CREATE POLICY "Users can manage their organization's family groups" 
ON public.family_groups 
FOR ALL 
USING (organization_id = public.get_user_organization_id());

-- RLS Policies for reservation_settings
CREATE POLICY "Users can view their organization's reservation settings" 
ON public.reservation_settings 
FOR SELECT 
USING (organization_id = public.get_user_organization_id());

CREATE POLICY "Users can manage their organization's reservation settings" 
ON public.reservation_settings 
FOR ALL 
USING (organization_id = public.get_user_organization_id());

-- RLS Policies for custom_checklists
CREATE POLICY "Users can view their organization's checklists" 
ON public.custom_checklists 
FOR SELECT 
USING (organization_id = public.get_user_organization_id());

CREATE POLICY "Users can manage their organization's checklists" 
ON public.custom_checklists 
FOR ALL 
USING (organization_id = public.get_user_organization_id());

-- RLS Policies for checkin_sessions
CREATE POLICY "Users can view their organization's check-in sessions" 
ON public.checkin_sessions 
FOR SELECT 
USING (organization_id = public.get_user_organization_id());

CREATE POLICY "Users can manage their organization's check-in sessions" 
ON public.checkin_sessions 
FOR ALL 
USING (organization_id = public.get_user_organization_id());

-- RLS Policies for survey_responses
CREATE POLICY "Users can view their organization's survey responses" 
ON public.survey_responses 
FOR SELECT 
USING (organization_id = public.get_user_organization_id());

CREATE POLICY "Users can manage their organization's survey responses" 
ON public.survey_responses 
FOR ALL 
USING (organization_id = public.get_user_organization_id());

-- RLS Policies for receipts
CREATE POLICY "Users can view their organization's receipts" 
ON public.receipts 
FOR SELECT 
USING (organization_id = public.get_user_organization_id());

CREATE POLICY "Users can manage their organization's receipts" 
ON public.receipts 
FOR ALL 
USING (organization_id = public.get_user_organization_id());

-- Add triggers for updated_at timestamps
CREATE TRIGGER update_organizations_updated_at
BEFORE UPDATE ON public.organizations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_family_groups_updated_at
BEFORE UPDATE ON public.family_groups
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_reservation_settings_updated_at
BEFORE UPDATE ON public.reservation_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_custom_checklists_updated_at
BEFORE UPDATE ON public.custom_checklists
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_checkin_sessions_updated_at
BEFORE UPDATE ON public.checkin_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_survey_responses_updated_at
BEFORE UPDATE ON public.survey_responses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_receipts_updated_at
BEFORE UPDATE ON public.receipts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();