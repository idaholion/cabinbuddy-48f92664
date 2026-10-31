-- Payment lines: every payment recorded against a stay becomes its own dated,
-- editable line. payments.amount_paid is kept in sync automatically.
-- Run once in the Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS public.payment_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  payment_id uuid NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
  amount numeric(10,2) NOT NULL,
  paid_date date NOT NULL DEFAULT CURRENT_DATE,
  payment_method text,
  payment_reference text,
  notes text,
  is_backfill boolean NOT NULL DEFAULT false,
  created_by_user_id uuid DEFAULT auth.uid(),
  updated_by_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_payment ON public.payment_transactions(payment_id);

-- Change log for every edit/delete of a payment line
CREATE TABLE IF NOT EXISTS public.payment_transaction_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid NOT NULL,
  payment_id uuid NOT NULL,
  organization_id uuid NOT NULL,
  action text NOT NULL,
  old_values jsonb,
  new_values jsonb,
  changed_by_user_id uuid DEFAULT auth.uid(),
  changed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_payment_tx_audit_payment ON public.payment_transaction_audit(payment_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_transactions TO authenticated;
GRANT ALL ON public.payment_transactions TO service_role;
GRANT SELECT ON public.payment_transaction_audit TO authenticated;
GRANT ALL ON public.payment_transaction_audit TO service_role;

ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_transaction_audit ENABLE ROW LEVEL SECURITY;

-- Anyone who can see/update the parent stay payment (the paying family,
-- Admin, Treasurer, supervisors) can see and manage its lines. The subquery
-- runs under the payments table's own access rules.
DROP POLICY IF EXISTS "View payment lines" ON public.payment_transactions;
CREATE POLICY "View payment lines" ON public.payment_transactions
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.payments p WHERE p.id = payment_id AND p.organization_id = payment_transactions.organization_id));

DROP POLICY IF EXISTS "Add payment lines" ON public.payment_transactions;
CREATE POLICY "Add payment lines" ON public.payment_transactions
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.payments p WHERE p.id = payment_id AND p.organization_id = payment_transactions.organization_id));

DROP POLICY IF EXISTS "Edit payment lines" ON public.payment_transactions;
CREATE POLICY "Edit payment lines" ON public.payment_transactions
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.payments p WHERE p.id = payment_id AND p.organization_id = payment_transactions.organization_id))
  WITH CHECK (EXISTS (SELECT 1 FROM public.payments p WHERE p.id = payment_id AND p.organization_id = payment_transactions.organization_id));

DROP POLICY IF EXISTS "Delete payment lines" ON public.payment_transactions;
CREATE POLICY "Delete payment lines" ON public.payment_transactions
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.payments p WHERE p.id = payment_id AND p.organization_id = payment_transactions.organization_id));

DROP POLICY IF EXISTS "View payment line history" ON public.payment_transaction_audit;
CREATE POLICY "View payment line history" ON public.payment_transaction_audit
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.payments p WHERE p.id = payment_id));

-- Keep payments.amount_paid in sync by applying the change (delta), so other
-- existing adjustments (credits applied, etc.) are preserved. Also logs history.
CREATE OR REPLACE FUNCTION public.sync_payment_transaction()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_delta numeric := 0;
  v_payment uuid;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_delta := NEW.amount; v_payment := NEW.payment_id;
    IF NOT NEW.is_backfill THEN
      INSERT INTO payment_transaction_audit(transaction_id, payment_id, organization_id, action, new_values)
      VALUES (NEW.id, NEW.payment_id, NEW.organization_id, 'created', to_jsonb(NEW));
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    v_delta := NEW.amount - OLD.amount; v_payment := NEW.payment_id;
    INSERT INTO payment_transaction_audit(transaction_id, payment_id, organization_id, action, old_values, new_values)
    VALUES (NEW.id, NEW.payment_id, NEW.organization_id, 'edited', to_jsonb(OLD), to_jsonb(NEW));
  ELSE
    v_delta := -OLD.amount; v_payment := OLD.payment_id;
    INSERT INTO payment_transaction_audit(transaction_id, payment_id, organization_id, action, old_values)
    VALUES (OLD.id, OLD.payment_id, OLD.organization_id, 'deleted', to_jsonb(OLD));
  END IF;

  -- Backfill rows describe money already counted in amount_paid
  IF TG_OP = 'INSERT' AND NEW.is_backfill THEN
    RETURN NEW;
  END IF;

  IF v_delta <> 0 THEN
    UPDATE payments
       SET amount_paid = round(greatest(coalesce(amount_paid,0) + v_delta, 0), 2),
           paid_date = CASE WHEN TG_OP = 'DELETE' THEN paid_date ELSE NEW.paid_date END,
           updated_at = now()
     WHERE id = v_payment;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_payment_transaction ON public.payment_transactions;
CREATE TRIGGER trg_sync_payment_transaction
AFTER INSERT OR UPDATE OR DELETE ON public.payment_transactions
FOR EACH ROW EXECUTE FUNCTION public.sync_payment_transaction();

CREATE OR REPLACE FUNCTION public.touch_payment_transaction()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); NEW.updated_by_user_id = auth.uid(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_touch_payment_transaction ON public.payment_transactions;
CREATE TRIGGER trg_touch_payment_transaction
BEFORE UPDATE ON public.payment_transactions
FOR EACH ROW EXECUTE FUNCTION public.touch_payment_transaction();

-- One-time backfill: each existing paid amount becomes a single editable line
-- ("Earlier payments"), so nothing changes in totals today.
INSERT INTO public.payment_transactions
  (organization_id, payment_id, amount, paid_date, payment_method, payment_reference, notes, is_backfill, created_by_user_id)
SELECT p.organization_id, p.id, p.amount_paid,
       coalesce(p.paid_date, p.updated_at::date, p.created_at::date),
       p.payment_method::text, p.payment_reference,
       'Earlier payments'
       || CASE WHEN p.notes IS NOT NULL AND p.notes <> '' THEN E'\n' || p.notes ELSE '' END,
       true, p.updated_by_user_id
FROM public.payments p
WHERE coalesce(p.amount_paid,0) > 0
  AND NOT EXISTS (SELECT 1 FROM public.payment_transactions t WHERE t.payment_id = p.id);
