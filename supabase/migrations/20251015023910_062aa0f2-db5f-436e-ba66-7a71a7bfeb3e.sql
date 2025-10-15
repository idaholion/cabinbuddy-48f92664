-- Re-enable RLS on payments table
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Keep the simple policy since the auth context is the issue, not the policy logic
-- This policy will work once we fix the auth token issue