-- Create work weekend comments table for feedback and discussion
CREATE TABLE public.work_weekend_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  work_weekend_id UUID NOT NULL,
  organization_id UUID NOT NULL,
  user_id UUID NOT NULL,
  commenter_name TEXT NOT NULL,
  commenter_email TEXT NOT NULL,
  commenter_family_group TEXT,
  comment TEXT NOT NULL,
  interest_level TEXT CHECK (interest_level IN ('interested', 'not_available', 'maybe', 'general_comment')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.work_weekend_comments ENABLE ROW LEVEL SECURITY;

-- Create policies for comments
CREATE POLICY "Users can view their organization's work weekend comments" 
ON public.work_weekend_comments 
FOR SELECT 
USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can create comments for their organization" 
ON public.work_weekend_comments 
FOR INSERT 
WITH CHECK (organization_id = get_user_organization_id() AND user_id = auth.uid());

CREATE POLICY "Users can update their own comments" 
ON public.work_weekend_comments 
FOR UPDATE 
USING (organization_id = get_user_organization_id() AND user_id = auth.uid());

CREATE POLICY "Users can delete their own comments" 
ON public.work_weekend_comments 
FOR DELETE 
USING (organization_id = get_user_organization_id() AND user_id = auth.uid());

CREATE POLICY "Supervisors can manage all work weekend comments" 
ON public.work_weekend_comments 
FOR ALL 
USING (is_supervisor());

-- Add invitation/notification tracking to work_weekends table
ALTER TABLE public.work_weekends 
ADD COLUMN invited_family_leads BOOLEAN DEFAULT false,
ADD COLUMN invited_all_members BOOLEAN DEFAULT false,
ADD COLUMN invitation_message TEXT,
ADD COLUMN notifications_sent_at TIMESTAMP WITH TIME ZONE;