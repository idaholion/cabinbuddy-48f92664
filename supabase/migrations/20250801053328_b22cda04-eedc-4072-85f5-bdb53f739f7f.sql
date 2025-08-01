-- Function to bulk update reservation permissions
CREATE OR REPLACE FUNCTION public.supervisor_bulk_update_reservations(
  p_organization_id uuid,
  p_confirmation_code text,
  p_enable_all_hosts boolean DEFAULT NULL,
  p_disable_all_hosts boolean DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  affected_count INTEGER := 0;
BEGIN
  -- Verify supervisor permission
  IF NOT is_supervisor() THEN
    RAISE EXCEPTION 'This function requires supervisor privileges';
  END IF;
  
  -- Verify confirmation code
  IF p_confirmation_code != 'CONFIRM_BULK_UPDATE' THEN
    RAISE EXCEPTION 'Invalid confirmation code. Use CONFIRM_BULK_UPDATE to proceed.';
  END IF;
  
  -- Update reservation permissions for all host members
  IF p_enable_all_hosts = true THEN
    UPDATE family_groups 
    SET 
      host_members = (
        SELECT jsonb_agg(
          jsonb_set(member, '{canMakeReservations}', 'true'::jsonb)
        )
        FROM jsonb_array_elements(COALESCE(host_members, '[]'::jsonb)) AS member
      ),
      updated_at = now()
    WHERE organization_id = p_organization_id AND host_members IS NOT NULL;
  ELSIF p_disable_all_hosts = true THEN
    UPDATE family_groups 
    SET 
      host_members = (
        SELECT jsonb_agg(
          jsonb_set(member, '{canMakeReservations}', 'false'::jsonb)
        )
        FROM jsonb_array_elements(COALESCE(host_members, '[]'::jsonb)) AS member
      ),
      updated_at = now()
    WHERE organization_id = p_organization_id AND host_members IS NOT NULL;
  END IF;
  
  GET DIAGNOSTICS affected_count = ROW_COUNT;
  
  RETURN affected_count;
END;
$function$