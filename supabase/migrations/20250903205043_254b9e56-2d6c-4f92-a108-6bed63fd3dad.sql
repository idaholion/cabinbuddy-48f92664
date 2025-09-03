-- Fix RLS policies for pdf_checklists to ensure authentication is required
DROP POLICY IF EXISTS "Users can view their own checklists" ON public.pdf_checklists;
DROP POLICY IF EXISTS "Users can create their own checklists" ON public.pdf_checklists;
DROP POLICY IF EXISTS "Users can update their own checklists" ON public.pdf_checklists;
DROP POLICY IF EXISTS "Users can delete their own checklists" ON public.pdf_checklists;

-- Create proper authenticated-only policies
CREATE POLICY "Authenticated users can view their own checklists" 
ON public.pdf_checklists 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Authenticated users can create their own checklists" 
ON public.pdf_checklists 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Authenticated users can update their own checklists" 
ON public.pdf_checklists 
FOR UPDATE 
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Authenticated users can delete their own checklists" 
ON public.pdf_checklists 
FOR DELETE 
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);