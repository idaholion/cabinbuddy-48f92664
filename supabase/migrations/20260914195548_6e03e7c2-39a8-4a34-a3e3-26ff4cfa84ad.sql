ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS allow_lead_credit_transfers boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.organizations.allow_lead_credit_transfers IS
  'When true, family group leads may transfer credit on behalf of members of their own group.';

CREATE OR REPLACE FUNCTION public.can_lead_transfer_credit(p_organization_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT o.allow_lead_credit_transfers
       FROM public.organizations o
      WHERE o.id = p_organization_id),
    false
  )
  AND EXISTS (
    SELECT 1
      FROM public.family_groups fg
     WHERE fg.organization_id = p_organization_id
       AND public.is_family_group_lead(p_organization_id, fg.name)
  );
$$;

DROP POLICY IF EXISTS "Group leads can record credit transfers" ON public.credit_transfers;

CREATE POLICY "Group leads can record credit transfers"
  ON public.credit_transfers
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = created_by_user_id
    AND public.user_belongs_to_organization(auth.uid(), organization_id)
    AND public.can_lead_transfer_credit(organization_id)
  );