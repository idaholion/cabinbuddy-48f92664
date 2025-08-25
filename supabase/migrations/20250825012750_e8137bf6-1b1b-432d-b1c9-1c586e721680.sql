-- Add RLS policy to allow authenticated users to find organizations by code for joining
CREATE POLICY "Authenticated users can find organizations by code to join them" 
ON public.organizations 
FOR SELECT 
TO authenticated 
USING (
  auth.uid() IS NOT NULL AND 
  code IS NOT NULL AND 
  code != ''
);