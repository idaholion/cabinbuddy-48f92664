CREATE OR REPLACE FUNCTION public.validate_organization_data_access()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Skip validation when no authenticated user (service role / edge function context)
  IF auth.uid() IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Skip validation for supervisors
  IF is_supervisor() THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  
  -- For INSERT and UPDATE operations
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    IF NOT validate_organization_access(NEW.organization_id, TG_TABLE_NAME || '_' || TG_OP) THEN
      RAISE EXCEPTION 'Access denied: Cannot % data for organization %', TG_OP, NEW.organization_id;
    END IF;
    RETURN NEW;
  END IF;
  
  -- For DELETE operations
  IF TG_OP = 'DELETE' THEN
    IF NOT validate_organization_access(OLD.organization_id, TG_TABLE_NAME || '_' || TG_OP) THEN
      RAISE EXCEPTION 'Access denied: Cannot % data for organization %', TG_OP, OLD.organization_id;
    END IF;
    RETURN OLD;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;