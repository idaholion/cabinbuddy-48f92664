-- Add reservation permission and alternate lead fields to family_groups table
ALTER TABLE public.family_groups 
ADD COLUMN reservation_permission text DEFAULT 'lead_only' CHECK (reservation_permission IN ('lead_only', 'all_hosts', 'lead_and_alternate')),
ADD COLUMN alternate_lead_id text;