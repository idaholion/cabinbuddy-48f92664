
-- Cabin Maintenance: entries (work log, reference info, to-do) + photos

CREATE TABLE public.cabin_maintenance_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  entry_type text NOT NULL CHECK (entry_type IN ('work_log','reference','todo')),
  title text NOT NULL,
  description text,
  category text,
  date_performed date,
  performed_by_name text,
  performed_by_user_id uuid,
  cost numeric(10,2),
  priority text CHECK (priority IN ('low','medium','high')),
  target_date date,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','completed')),
  completed_at timestamptz,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cabin_maintenance_entries TO authenticated;
GRANT ALL ON public.cabin_maintenance_entries TO service_role;

ALTER TABLE public.cabin_maintenance_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view maintenance entries"
  ON public.cabin_maintenance_entries FOR SELECT
  TO authenticated
  USING (public.user_belongs_to_organization(auth.uid(), organization_id));

CREATE POLICY "Org members can insert maintenance entries"
  ON public.cabin_maintenance_entries FOR INSERT
  TO authenticated
  WITH CHECK (
    public.user_belongs_to_organization(auth.uid(), organization_id)
    AND created_by = auth.uid()
  );

CREATE POLICY "Author or admin can update maintenance entries"
  ON public.cabin_maintenance_entries FOR UPDATE
  TO authenticated
  USING (
    public.user_belongs_to_organization(auth.uid(), organization_id)
    AND (created_by = auth.uid() OR public.is_organization_admin())
  );

CREATE POLICY "Author or admin can delete maintenance entries"
  ON public.cabin_maintenance_entries FOR DELETE
  TO authenticated
  USING (
    public.user_belongs_to_organization(auth.uid(), organization_id)
    AND (created_by = auth.uid() OR public.is_organization_admin())
  );

CREATE INDEX idx_cabin_maint_org_type ON public.cabin_maintenance_entries(organization_id, entry_type);
CREATE INDEX idx_cabin_maint_date ON public.cabin_maintenance_entries(date_performed DESC);

CREATE TRIGGER trg_cabin_maint_updated_at
  BEFORE UPDATE ON public.cabin_maintenance_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


CREATE TABLE public.cabin_maintenance_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id uuid NOT NULL REFERENCES public.cabin_maintenance_entries(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  caption text,
  uploaded_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cabin_maintenance_photos TO authenticated;
GRANT ALL ON public.cabin_maintenance_photos TO service_role;

ALTER TABLE public.cabin_maintenance_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view maintenance photos"
  ON public.cabin_maintenance_photos FOR SELECT
  TO authenticated
  USING (public.user_belongs_to_organization(auth.uid(), organization_id));

CREATE POLICY "Org members can insert maintenance photos"
  ON public.cabin_maintenance_photos FOR INSERT
  TO authenticated
  WITH CHECK (
    public.user_belongs_to_organization(auth.uid(), organization_id)
    AND uploaded_by = auth.uid()
  );

CREATE POLICY "Uploader or admin can delete maintenance photos"
  ON public.cabin_maintenance_photos FOR DELETE
  TO authenticated
  USING (
    public.user_belongs_to_organization(auth.uid(), organization_id)
    AND (uploaded_by = auth.uid() OR public.is_organization_admin())
  );

CREATE INDEX idx_cabin_maint_photos_entry ON public.cabin_maintenance_photos(entry_id);
