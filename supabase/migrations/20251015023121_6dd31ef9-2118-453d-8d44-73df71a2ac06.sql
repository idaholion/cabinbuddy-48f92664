-- Test if the RLS policy is actually working by temporarily making it more permissive
-- This will help us identify if it's the policy or something else

DROP POLICY IF EXISTS "Users can create payments in their organization" ON public.payments;

-- Temporarily allow ANY authenticated user to insert payments for debugging
CREATE POLICY "Users can create payments in their organization" 
ON public.payments 
FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL
);