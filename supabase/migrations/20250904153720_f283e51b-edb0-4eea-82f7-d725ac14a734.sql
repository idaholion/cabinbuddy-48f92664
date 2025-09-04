-- Create checklist_progress table for tracking checklist completion
CREATE TABLE IF NOT EXISTS public.checklist_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  checklist_id UUID NOT NULL,
  item_id TEXT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, checklist_id, item_id)
);

-- Enable Row Level Security
ALTER TABLE public.checklist_progress ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own checklist progress" 
ON public.checklist_progress 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own checklist progress" 
ON public.checklist_progress 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own checklist progress" 
ON public.checklist_progress 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own checklist progress" 
ON public.checklist_progress 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_checklist_progress_updated_at
BEFORE UPDATE ON public.checklist_progress
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();