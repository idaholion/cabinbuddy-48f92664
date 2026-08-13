ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS delivery_selection_turn text NOT NULL DEFAULT 'email',
  ADD COLUMN IF NOT EXISTS delivery_selection_ending text NOT NULL DEFAULT 'email',
  ADD COLUMN IF NOT EXISTS delivery_work_weekend text NOT NULL DEFAULT 'email';