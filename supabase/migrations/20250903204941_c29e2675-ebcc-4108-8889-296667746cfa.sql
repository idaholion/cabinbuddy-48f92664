-- Create table to store PDF checklist data
CREATE TABLE public.pdf_checklists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  pdf_url TEXT,
  pages_data JSONB DEFAULT '[]'::jsonb,
  checkboxes JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.pdf_checklists ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own checklists" 
ON public.pdf_checklists 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own checklists" 
ON public.pdf_checklists 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own checklists" 
ON public.pdf_checklists 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own checklists" 
ON public.pdf_checklists 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_pdf_checklists_updated_at
BEFORE UPDATE ON public.pdf_checklists
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();