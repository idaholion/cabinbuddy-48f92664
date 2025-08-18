-- Secure the payments table from anonymous access
-- This table contains sensitive financial data that must be protected

-- Force RLS and revoke anonymous access
ALTER TABLE public.payments FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.payments FROM PUBLIC;
REVOKE ALL ON public.payments FROM anon;

-- Also secure other financial tables while we're at it
ALTER TABLE public.receipts FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.receipts FROM PUBLIC;
REVOKE ALL ON public.receipts FROM anon;

ALTER TABLE public.recurring_bills FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.recurring_bills FROM PUBLIC;
REVOKE ALL ON public.recurring_bills FROM anon;

-- Secure family group shares (financial allocation data)
ALTER TABLE public.family_group_shares FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.family_group_shares FROM PUBLIC;
REVOKE ALL ON public.family_group_shares FROM anon;

ALTER TABLE public.member_share_allocations FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.member_share_allocations FROM PUBLIC;
REVOKE ALL ON public.member_share_allocations FROM anon;