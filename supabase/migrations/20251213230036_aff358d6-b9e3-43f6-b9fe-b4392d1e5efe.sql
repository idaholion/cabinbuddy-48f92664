-- Phase 1A: Database Schema Enhancements for Test Data Isolation

-- 1. Add financial_test_mode column to organizations table
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS financial_test_mode BOOLEAN DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN public.organizations.financial_test_mode IS 'When true, financial data (payments, invoices) is marked as test data and excluded from production reports';

-- 2. Create organization_safety_audit table for tracking cross-organization operations
CREATE TABLE IF NOT EXISTS public.organization_safety_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id),
  operation_type TEXT NOT NULL,
  query_context JSONB DEFAULT '{}'::jsonb,
  user_id UUID,
  is_suspicious BOOLEAN DEFAULT false,
  severity TEXT DEFAULT 'info',
  table_name TEXT,
  details TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add comments for documentation
COMMENT ON TABLE public.organization_safety_audit IS 'Tracks cross-organization operations and suspicious queries for security monitoring';
COMMENT ON COLUMN public.organization_safety_audit.is_suspicious IS 'True if the operation was flagged as potentially dangerous';
COMMENT ON COLUMN public.organization_safety_audit.severity IS 'Severity level: info, warning, error, critical';

-- 3. Add indexes for test organization queries
CREATE INDEX IF NOT EXISTS idx_organizations_is_test 
ON public.organizations(is_test_organization);

CREATE INDEX IF NOT EXISTS idx_organizations_financial_test_mode 
ON public.organizations(financial_test_mode);

CREATE INDEX IF NOT EXISTS idx_organization_safety_audit_org_id 
ON public.organization_safety_audit(organization_id);

CREATE INDEX IF NOT EXISTS idx_organization_safety_audit_suspicious 
ON public.organization_safety_audit(is_suspicious) WHERE is_suspicious = true;

CREATE INDEX IF NOT EXISTS idx_organization_safety_audit_created 
ON public.organization_safety_audit(created_at DESC);

-- 4. Enable RLS on organization_safety_audit
ALTER TABLE public.organization_safety_audit ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS policies for organization_safety_audit
CREATE POLICY "Supervisors can view all safety audit logs"
ON public.organization_safety_audit
FOR SELECT
USING (is_supervisor());

CREATE POLICY "Supervisors can manage all safety audit logs"
ON public.organization_safety_audit
FOR ALL
USING (is_supervisor());

CREATE POLICY "System can insert safety audit logs"
ON public.organization_safety_audit
FOR INSERT
WITH CHECK (
  ((current_setting('request.jwt.claims'::text, true))::json ->> 'role' = 'service_role')
  OR is_supervisor()
);

-- 6. Organization admins can view their own organization's audit logs
CREATE POLICY "Admins can view their organization safety audit"
ON public.organization_safety_audit
FOR SELECT
USING (
  organization_id = get_user_organization_id() 
  AND is_organization_admin()
);