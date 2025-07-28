-- Add secondary selection controls to rotation_orders table
ALTER TABLE rotation_orders ADD COLUMN enable_secondary_selection boolean DEFAULT false;
ALTER TABLE rotation_orders ADD COLUMN secondary_max_periods integer DEFAULT 1;

-- Add round tracking to time_period_usage  
ALTER TABLE time_period_usage ADD COLUMN selection_round text DEFAULT 'primary';
ALTER TABLE time_period_usage ADD COLUMN secondary_periods_used integer DEFAULT 0;
ALTER TABLE time_period_usage ADD COLUMN secondary_periods_allowed integer DEFAULT 1;

-- Add secondary selection state tracking
CREATE TABLE secondary_selection_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  rotation_year integer NOT NULL,
  started_at timestamp with time zone,
  current_family_group text,
  current_group_index integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(organization_id, rotation_year)
);

-- Enable RLS on secondary_selection_status table
ALTER TABLE secondary_selection_status ENABLE ROW LEVEL SECURITY;

-- Create policies for secondary_selection_status
CREATE POLICY "Users can manage their organization's secondary selection status" 
ON secondary_selection_status 
FOR ALL 
USING (organization_id = get_user_organization_id());

CREATE POLICY "Supervisors can manage all secondary selection status" 
ON secondary_selection_status 
FOR ALL 
USING (is_supervisor());