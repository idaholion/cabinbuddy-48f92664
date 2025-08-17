-- Add missing tables and components

-- Individual member share allocations within family groups (if not exists)
CREATE TABLE IF NOT EXISTS public.member_share_allocations (
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

-- Individual votes (if not exists)
CREATE TABLE IF NOT EXISTS public.votes (
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

-- Enable RLS if not already enabled
ALTER TABLE public.member_share_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for member_share_allocations
DROP POLICY IF EXISTS "Family leads can view their group's member allocations" ON public.member_share_allocations;
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

DROP POLICY IF EXISTS "Family leads can manage their group's member allocations" ON public.member_share_allocations;
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

DROP POLICY IF EXISTS "Supervisors can manage all member allocations" ON public.member_share_allocations;
CREATE POLICY "Supervisors can manage all member allocations" 
ON public.member_share_allocations 
FOR ALL 
USING (is_supervisor());

-- RLS Policies for votes
DROP POLICY IF EXISTS "Family leads can view their group's votes" ON public.votes;
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

DROP POLICY IF EXISTS "Users can vote in their organization" ON public.votes;
CREATE POLICY "Users can vote in their organization" 
ON public.votes 
FOR INSERT 
WITH CHECK (organization_id = get_user_organization_id());

DROP POLICY IF EXISTS "Supervisors can view all votes" ON public.votes;
CREATE POLICY "Supervisors can view all votes" 
ON public.votes 
FOR ALL 
USING (is_supervisor());