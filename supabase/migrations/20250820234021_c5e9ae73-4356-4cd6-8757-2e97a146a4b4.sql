-- Create proposal comments table for discussion system
CREATE TABLE public.proposal_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  proposal_id UUID NOT NULL,
  user_id UUID NOT NULL,
  organization_id UUID NOT NULL,
  comment TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user share allocations table (individual user-based)
CREATE TABLE public.user_share_allocations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  user_id UUID NOT NULL,
  family_group_name TEXT NOT NULL,
  allocated_shares INTEGER NOT NULL DEFAULT 0,
  allocated_by_user_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(organization_id, user_id)
);

-- Create voting_proposals table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.voting_proposals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  created_by_user_id UUID,
  created_by_name TEXT,
  created_by_family_group TEXT,
  voting_deadline TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'active',
  total_shares_voted INTEGER NOT NULL DEFAULT 0,
  shares_for INTEGER NOT NULL DEFAULT 0,
  shares_against INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create votes table if it doesn't exist  
CREATE TABLE IF NOT EXISTS public.votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  proposal_id UUID NOT NULL,
  organization_id UUID NOT NULL,
  user_id UUID NOT NULL,
  family_group_name TEXT NOT NULL,
  shares_used INTEGER NOT NULL,
  vote_choice TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(proposal_id, user_id)
);

-- Enable RLS on new tables
ALTER TABLE public.proposal_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_share_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voting_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;

-- RLS policies for proposal_comments
CREATE POLICY "Users can view comments in their organization" 
ON public.proposal_comments 
FOR SELECT 
USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can create comments in their organization"
ON public.proposal_comments 
FOR INSERT 
WITH CHECK (organization_id = get_user_organization_id() AND user_id = auth.uid());

CREATE POLICY "Users can update their own comments"
ON public.proposal_comments 
FOR UPDATE 
USING (user_id = auth.uid() AND organization_id = get_user_organization_id());

CREATE POLICY "Supervisors can manage all proposal comments"
ON public.proposal_comments 
FOR ALL 
USING (is_supervisor());

-- RLS policies for user_share_allocations
CREATE POLICY "Users can view their organization's share allocations"
ON public.user_share_allocations 
FOR SELECT 
USING (organization_id = get_user_organization_id());

CREATE POLICY "Family leads can manage their group's user allocations"
ON public.user_share_allocations 
FOR ALL 
USING (
  organization_id = get_user_organization_id() AND 
  EXISTS (
    SELECT 1 FROM family_groups 
    WHERE family_groups.organization_id = get_user_organization_id() 
    AND family_groups.name = user_share_allocations.family_group_name 
    AND (family_groups.lead_email = get_current_user_email() OR family_groups.alternate_lead_id = get_current_user_email())
  )
);

CREATE POLICY "Organization admins can manage all user allocations"
ON public.user_share_allocations 
FOR ALL 
USING (organization_id = get_user_organization_id() AND is_organization_admin());

CREATE POLICY "Supervisors can manage all user allocations"
ON public.user_share_allocations 
FOR ALL 
USING (is_supervisor());

-- RLS policies for voting_proposals
CREATE POLICY "Users can view their organization's proposals"
ON public.voting_proposals 
FOR SELECT 
USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can create proposals in their organization"
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

CREATE POLICY "Supervisors can manage all proposals"
ON public.voting_proposals 
FOR ALL 
USING (is_supervisor());

-- RLS policies for votes
CREATE POLICY "Users can view votes in their organization"
ON public.votes 
FOR SELECT 
USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can cast their own votes"
ON public.votes 
FOR INSERT 
WITH CHECK (organization_id = get_user_organization_id() AND user_id = auth.uid());

CREATE POLICY "Supervisors can manage all votes"
ON public.votes 
FOR ALL 
USING (is_supervisor());

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_proposal_comments_updated_at
  BEFORE UPDATE ON public.proposal_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_share_allocations_updated_at
  BEFORE UPDATE ON public.user_share_allocations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_voting_proposals_updated_at
  BEFORE UPDATE ON public.voting_proposals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_votes_updated_at
  BEFORE UPDATE ON public.votes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();