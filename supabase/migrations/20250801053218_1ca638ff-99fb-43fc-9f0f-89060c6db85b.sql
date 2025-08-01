-- Function to bulk update lead contact information
CREATE OR REPLACE FUNCTION public.supervisor_bulk_update_leads(
  p_organization_id uuid,
  p_confirmation_code text,
  p_lead_phone text DEFAULT NULL,
  p_lead_email text DEFAULT NULL
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
  
  -- Update lead contact information for all groups in organization
  UPDATE family_groups 
  SET 
    lead_phone = COALESCE(p_lead_phone, lead_phone),
    lead_email = COALESCE(p_lead_email, lead_email),
    updated_at = now()
  WHERE organization_id = p_organization_id;
  
  GET DIAGNOSTICS affected_count = ROW_COUNT;
  
  RETURN affected_count;
END;
$function$