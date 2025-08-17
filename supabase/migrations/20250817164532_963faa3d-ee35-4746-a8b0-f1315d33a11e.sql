-- Create voting system tables

-- Organization voting settings
CREATE TABLE public.organization_voting_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  total_shares INTEGER NOT NULL DEFAULT 100,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Family group share allocations
CREATE TABLE public.family_group_shares (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  family_group_name TEXT NOT NULL,
  allocated_shares INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(organization_id, family_group_name)
);

-- Individual member share allocations within family groups
CREATE TABLE public.member_share_allocations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  family_group_name TEXT NOT NULL,
  member_name TEXT NOT NULL,
  member_email TEXT,
  allocated_shares INTEGER NOT NULL DEFAULT 0,
  allocated_by_user_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(organization_id, family_group_name, member_name)
);

-- Voting proposals
CREATE TABLE public.voting_proposals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  created_by_user_id UUID,
  created_by_name TEXT,
  created_by_family_group TEXT,
  voting_deadline TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'active',
  total_shares_voted INTEGER DEFAULT 0,
  shares_for INTEGER DEFAULT 0,
  shares_against INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Individual votes (only family leads can see their group's distribution)
CREATE TABLE public.votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  proposal_id UUID NOT NULL,
  organization_id UUID NOT NULL,
  family_group_name TEXT NOT NULL,
  voter_name TEXT NOT NULL,
  voter_email TEXT,
  shares_used INTEGER NOT NULL,
  vote_choice TEXT NOT NULL, -- 'for' or 'against'
  voted_by_user_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.organization_voting_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_group_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_share_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voting_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for organization_voting_settings
CREATE POLICY "Users can view their organization's voting settings" 
ON public.organization_voting_settings 
FOR SELECT 
USING (organization_id = get_user_organization_id());

CREATE POLICY "Admins can manage voting settings" 
ON public.organization_voting_settings 
FOR ALL 
USING (organization_id = get_user_organization_id() AND is_organization_admin());

CREATE POLICY "Supervisors can manage all voting settings" 
ON public.organization_voting_settings 
FOR ALL 
USING (is_supervisor());

-- RLS Policies for family_group_shares
CREATE POLICY "Users can view their organization's family group shares" 
ON public.family_group_shares 
FOR SELECT 
USING (organization_id = get_user_organization_id());

CREATE POLICY "Admins can manage family group shares" 
ON public.family_group_shares 
FOR ALL 
USING (organization_id = get_user_organization_id() AND is_organization_admin());

CREATE POLICY "Supervisors can manage all family group shares" 
ON public.family_group_shares 
FOR ALL 
USING (is_supervisor());

-- RLS Policies for member_share_allocations
CREATE POLICY "Family leads can view their group's member allocations" 
ON public.member_share_allocations 
FOR SELECT 
USING (
  organization_id = get_user_organization_id() AND 
  EXISTS (
    SELECT 1 FROM family_groups 
    WHERE organization_id = get_user_organization_id() 
    AND name = family_group_name 
    AND (lead_email = (SELECT email FROM auth.users WHERE id = auth.uid()) OR 
         alternate_lead_id = (SELECT email FROM auth.users WHERE id = auth.uid()))
  )
);

CREATE POLICY "Family leads can manage their group's member allocations" 
ON public.member_share_allocations 
FOR ALL 
USING (
  organization_id = get_user_organization_id() AND 
  EXISTS (
    SELECT 1 FROM family_groups 
    WHERE organization_id = get_user_organization_id() 
    AND name = family_group_name 
    AND (lead_email = (SELECT email FROM auth.users WHERE id = auth.uid()) OR 
         alternate_lead_id = (SELECT email FROM auth.users WHERE id = auth.uid()))
  )
);

CREATE POLICY "Supervisors can manage all member allocations" 
ON public.member_share_allocations 
FOR ALL 
USING (is_supervisor());

-- RLS Policies for voting_proposals
CREATE POLICY "Users can view their organization's voting proposals" 
ON public.voting_proposals 
FOR SELECT 
USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can create voting proposals for their organization" 
ON public.voting_proposals 
FOR INSERT 
WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "Proposal creators and admins can update proposals" 
ON public.voting_proposals 
FOR UPDATE 
USING (
  organization_id = get_user_organization_id() AND 
  (created_by_user_id = auth.uid() OR is_organization_admin())
);

CREATE POLICY "Supervisors can manage all voting proposals" 
ON public.voting_proposals 
FOR ALL 
USING (is_supervisor());

-- RLS Policies for votes
CREATE POLICY "Family leads can view their group's votes" 
ON public.votes 
FOR SELECT 
USING (
  organization_id = get_user_organization_id() AND 
  EXISTS (
    SELECT 1 FROM family_groups 
    WHERE organization_id = get_user_organization_id() 
    AND name = family_group_name 
    AND (lead_email = (SELECT email FROM auth.users WHERE id = auth.uid()) OR 
         alternate_lead_id = (SELECT email FROM auth.users WHERE id = auth.uid()))
  )
);

CREATE POLICY "Users can vote in their organization" 
ON public.votes 
FOR INSERT 
WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "Supervisors can view all votes" 
ON public.votes 
FOR ALL 
USING (is_supervisor());

-- Add triggers for updated_at
CREATE TRIGGER update_organization_voting_settings_updated_at
BEFORE UPDATE ON public.organization_voting_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_family_group_shares_updated_at
BEFORE UPDATE ON public.family_group_shares
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_member_share_allocations_updated_at
BEFORE UPDATE ON public.member_share_allocations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_voting_proposals_updated_at
BEFORE UPDATE ON public.voting_proposals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();