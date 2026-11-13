-- Make "days ahead" for automatic season setup default to 2 for any NEW organization.
-- Your Andrew Family Cabin organization is already saved at 2, so this changes nothing there.
-- It only affects organizations created from now on (and any row that was never set).

ALTER TABLE public.organizations
  ALTER COLUMN selection_season_lead_days SET DEFAULT 2;

-- Optional: bring the two non-selection demo organizations in line with the new default.
-- Safe to run or skip; they do not use rotating selection.
-- UPDATE public.organizations SET selection_season_lead_days = 2 WHERE allocation_model <> 'rotating_selection';
