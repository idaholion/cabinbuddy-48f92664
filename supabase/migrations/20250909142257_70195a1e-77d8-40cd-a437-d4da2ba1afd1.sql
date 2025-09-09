-- Create shared notes table
CREATE TABLE public.shared_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  tags TEXT[] DEFAULT '{}',
  priority TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'active',
  created_by_user_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by_user_id UUID
);

-- Create index for better performance
CREATE INDEX idx_shared_notes_organization_id ON public.shared_notes(organization_id);
CREATE INDEX idx_shared_notes_category ON public.shared_notes(category);
CREATE INDEX idx_shared_notes_status ON public.shared_notes(status);
CREATE INDEX idx_shared_notes_tags ON public.shared_notes USING GIN(tags);

-- Enable RLS
ALTER TABLE public.shared_notes ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their organization's notes" 
ON public.shared_notes 
FOR SELECT 
USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can create notes for their organization" 
ON public.shared_notes 
FOR INSERT 
WITH CHECK (organization_id = get_user_organization_id() AND created_by_user_id = auth.uid());

CREATE POLICY "Users can update their organization's notes" 
ON public.shared_notes 
FOR UPDATE 
USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can delete their organization's notes" 
ON public.shared_notes 
FOR DELETE 
USING (organization_id = get_user_organization_id());

CREATE POLICY "Supervisors can manage all notes" 
ON public.shared_notes 
FOR ALL 
USING (is_supervisor());

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_shared_notes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  NEW.updated_by_user_id = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_shared_notes_updated_at
BEFORE UPDATE ON public.shared_notes
FOR EACH ROW
EXECUTE FUNCTION public.update_shared_notes_updated_at();