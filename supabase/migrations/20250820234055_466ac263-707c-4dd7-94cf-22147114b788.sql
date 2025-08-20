-- Create proposal comments table for discussion system
CREATE TABLE IF NOT EXISTS public.proposal_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  proposal_id UUID NOT NULL,
  user_id UUID NOT NULL,
  organization_id UUID NOT NULL,
  comment TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user share allocations table (individual user-based)
CREATE TABLE IF NOT EXISTS public.user_share_allocations (
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

-- Enable RLS on new tables if they exist
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'proposal_comments' AND table_schema = 'public') THEN
    ALTER TABLE public.proposal_comments ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_share_allocations' AND table_schema = 'public') THEN
    ALTER TABLE public.user_share_allocations ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Create RLS policies for proposal_comments (only if they don't exist)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'proposal_comments' AND policyname = 'Users can view comments in their organization') THEN
    EXECUTE 'CREATE POLICY "Users can view comments in their organization" ON public.proposal_comments FOR SELECT USING (organization_id = get_user_organization_id())';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'proposal_comments' AND policyname = 'Users can create comments in their organization') THEN
    EXECUTE 'CREATE POLICY "Users can create comments in their organization" ON public.proposal_comments FOR INSERT WITH CHECK (organization_id = get_user_organization_id() AND user_id = auth.uid())';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'proposal_comments' AND policyname = 'Users can update their own comments') THEN
    EXECUTE 'CREATE POLICY "Users can update their own comments" ON public.proposal_comments FOR UPDATE USING (user_id = auth.uid() AND organization_id = get_user_organization_id())';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'proposal_comments' AND policyname = 'Supervisors can manage all proposal comments') THEN
    EXECUTE 'CREATE POLICY "Supervisors can manage all proposal comments" ON public.proposal_comments FOR ALL USING (is_supervisor())';
  END IF;
END $$;

-- Create RLS policies for user_share_allocations (only if they don't exist)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_share_allocations' AND policyname = 'Users can view their organization''s share allocations') THEN
    EXECUTE 'CREATE POLICY "Users can view their organization''s share allocations" ON public.user_share_allocations FOR SELECT USING (organization_id = get_user_organization_id())';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_share_allocations' AND policyname = 'Family leads can manage their group''s user allocations') THEN
    EXECUTE 'CREATE POLICY "Family leads can manage their group''s user allocations" ON public.user_share_allocations FOR ALL USING (organization_id = get_user_organization_id() AND EXISTS (SELECT 1 FROM family_groups WHERE family_groups.organization_id = get_user_organization_id() AND family_groups.name = user_share_allocations.family_group_name AND (family_groups.lead_email = get_current_user_email() OR family_groups.alternate_lead_id = get_current_user_email())))';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_share_allocations' AND policyname = 'Organization admins can manage all user allocations') THEN
    EXECUTE 'CREATE POLICY "Organization admins can manage all user allocations" ON public.user_share_allocations FOR ALL USING (organization_id = get_user_organization_id() AND is_organization_admin())';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_share_allocations' AND policyname = 'Supervisors can manage all user allocations') THEN
    EXECUTE 'CREATE POLICY "Supervisors can manage all user allocations" ON public.user_share_allocations FOR ALL USING (is_supervisor())';
  END IF;
END $$;