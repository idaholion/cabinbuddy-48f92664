CREATE TABLE public.credit_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  from_ledger_name text NOT NULL,
  to_ledger_name text NOT NULL,
  amount numeric(10,2) NOT NULL,
  transfer_date date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  created_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.credit_transfers TO authenticated;
GRANT ALL ON public.credit_transfers TO service_role;

ALTER TABLE public.credit_transfers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organization members can view credit transfers"
  ON public.credit_transfers
  FOR SELECT
  TO authenticated
  USING (public.user_belongs_to_organization(auth.uid(), organization_id));

CREATE POLICY "Admins and treasurers can manage credit transfers"
  ON public.credit_transfers
  FOR ALL
  TO authenticated
  USING (
    public.is_org_admin_for(organization_id)
  )
  WITH CHECK (
    public.is_org_admin_for(organization_id)
  );

CREATE POLICY "Credit holders can transfer their own credit"
  ON public.credit_transfers
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = created_by_user_id
    AND public.user_belongs_to_organization(auth.uid(), organization_id)
  );

CREATE TRIGGER update_credit_transfers_updated_at
  BEFORE UPDATE ON public.credit_transfers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();