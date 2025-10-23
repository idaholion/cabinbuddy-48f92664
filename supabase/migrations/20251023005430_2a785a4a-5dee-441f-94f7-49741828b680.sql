-- Create function to delete all payments for an organization (admin only)
-- This allows starting fresh when payment records were incorrectly generated
CREATE OR REPLACE FUNCTION public.delete_all_organization_payments(p_organization_id uuid, p_confirmation_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  deleted_count INTEGER := 0;
BEGIN
  -- Only allow admins to delete all payments
  IF NOT (is_organization_admin() AND validate_organization_access(p_organization_id, 'delete_all_payments')) THEN
    RAISE EXCEPTION 'Access denied: Only organization admins can delete all payments';
  END IF;
  
  -- Require confirmation code
  IF p_confirmation_code != 'DELETE_ALL_PAYMENTS' THEN
    RAISE EXCEPTION 'Invalid confirmation code. Use DELETE_ALL_PAYMENTS to proceed.';
  END IF;

  -- Delete all payment splits first (foreign key constraint)
  DELETE FROM payment_splits WHERE organization_id = p_organization_id;
  
  -- Delete all payments
  DELETE FROM payments WHERE organization_id = p_organization_id;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Log the operation
  INSERT INTO bulk_operation_audit (
    operation_type,
    records_affected,
    performed_by_user_id,
    organization_id,
    details
  ) VALUES (
    'DELETE_ALL_PAYMENTS',
    deleted_count,
    auth.uid(),
    p_organization_id,
    jsonb_build_object(
      'confirmation_code', p_confirmation_code,
      'deleted_payments', deleted_count
    )
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'deleted_count', deleted_count,
    'message', format('Successfully deleted all %s payment records', deleted_count)
  );
END;
$$;