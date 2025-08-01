-- Function to bulk remove host member by name
CREATE OR REPLACE FUNCTION public.supervisor_bulk_remove_host_member(
  p_organization_id uuid,
  p_confirmation_code text,
  p_host_name text
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
  
  -- Remove host member from all groups in organization
  UPDATE family_groups 
  SET 
    host_members = (
      SELECT jsonb_agg(member)
      FROM jsonb_array_elements(COALESCE(host_members, '[]'::jsonb)) AS member
      WHERE member->>'name' != p_host_name
    ),
    updated_at = now()
  WHERE organization_id = p_organization_id 
    AND host_members::text LIKE '%' || p_host_name || '%';
  
  GET DIAGNOSTICS affected_count = ROW_COUNT;
  
  RETURN affected_count;
END;
$function$