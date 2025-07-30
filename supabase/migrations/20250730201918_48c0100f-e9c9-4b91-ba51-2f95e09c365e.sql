-- Add constraint to prevent bulk updates unless by supervisor
-- Create function to check if operation is from supervisor context
CREATE OR REPLACE FUNCTION public.check_bulk_family_group_update()
RETURNS TRIGGER AS $$
DECLARE
  update_count INTEGER;
  is_bulk_operation BOOLEAN := FALSE;
BEGIN
  -- Get current count of family groups being updated in this transaction
  -- Check if more than 2 family groups are being updated at once
  SELECT COUNT(*) INTO update_count
  FROM family_groups 
  WHERE organization_id = NEW.organization_id 
  AND updated_at > (NOW() - INTERVAL '1 second');
  
  -- If updating more than 2 groups within 1 second, consider it bulk
  IF update_count >= 2 THEN
    is_bulk_operation := TRUE;
  END IF;
  
  -- Allow bulk operations only for supervisors
  IF is_bulk_operation AND NOT is_supervisor() THEN
    RAISE EXCEPTION 'Bulk family group updates are restricted to supervisors only. Contact your administrator.';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to prevent unauthorized bulk updates
CREATE TRIGGER prevent_bulk_family_group_updates
  BEFORE UPDATE ON family_groups
  FOR EACH ROW
  EXECUTE FUNCTION check_bulk_family_group_update();

-- Modify assign_default_colors function to require supervisor permission
CREATE OR REPLACE FUNCTION public.assign_default_colors()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  group_record RECORD;
  available_colors TEXT[];
  color_index INTEGER := 1;
BEGIN
  -- Restrict to supervisors only
  IF NOT is_supervisor() THEN
    RAISE EXCEPTION 'assign_default_colors function can only be executed by supervisors';
  END IF;
  
  -- Loop through family groups without colors
  FOR group_record IN 
    SELECT id, organization_id 
    FROM family_groups 
    WHERE color IS NULL
    ORDER BY organization_id, created_at
  LOOP
    -- Get available colors for this organization
    SELECT get_available_colors(group_record.organization_id) INTO available_colors;
    
    -- Assign the first available color
    IF array_length(available_colors, 1) > 0 THEN
      UPDATE family_groups 
      SET color = available_colors[1]
      WHERE id = group_record.id;
    END IF;
  END LOOP;
END;
$function$;

-- Create function to safely perform bulk operations with confirmation
CREATE OR REPLACE FUNCTION public.supervisor_bulk_update_family_groups(
  p_organization_id UUID,
  p_confirmation_code TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Verify supervisor permission
  IF NOT is_supervisor() THEN
    RAISE EXCEPTION 'This function requires supervisor privileges';
  END IF;
  
  -- Verify confirmation code
  IF p_confirmation_code != 'CONFIRM_BULK_UPDATE' THEN
    RAISE EXCEPTION 'Invalid confirmation code. Use CONFIRM_BULK_UPDATE to proceed.';
  END IF;
  
  -- This function can be extended to perform specific bulk operations
  -- For now, it's a safe wrapper for bulk operations
  
  RETURN TRUE;
END;
$function$;

-- Add audit table for tracking bulk operations
CREATE TABLE IF NOT EXISTS public.bulk_operation_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_type TEXT NOT NULL,
  organization_id UUID,
  performed_by_user_id UUID,
  performed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  details JSONB,
  records_affected INTEGER
);

-- Enable RLS on audit table
ALTER TABLE public.bulk_operation_audit ENABLE ROW LEVEL SECURITY;

-- Create policies for audit table
CREATE POLICY "Supervisors can view all audit records" 
ON public.bulk_operation_audit 
FOR SELECT 
USING (is_supervisor());

CREATE POLICY "System can insert audit records" 
ON public.bulk_operation_audit 
FOR INSERT 
WITH CHECK (true);