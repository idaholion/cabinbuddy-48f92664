-- Fix the search path security issue for the function we just created
CREATE OR REPLACE FUNCTION generate_unique_organization_code(base_code text DEFAULT NULL)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  candidate_code text;
  counter integer := 1;
  code_exists boolean := true;
BEGIN
  -- Use provided base_code or generate a random one
  IF base_code IS NULL THEN
    candidate_code := upper(substring(md5(random()::text) from 1 for 6));
  ELSE
    candidate_code := upper(base_code);
  END IF;
  
  -- Check if code exists and increment until we find a unique one
  WHILE code_exists LOOP
    SELECT EXISTS(SELECT 1 FROM organizations WHERE code = candidate_code) INTO code_exists;
    
    IF code_exists THEN
      IF base_code IS NULL THEN
        -- Generate completely new random code
        candidate_code := upper(substring(md5(random()::text) from 1 for 6));
      ELSE
        -- Append number to base code
        candidate_code := upper(base_code) || counter::text;
        counter := counter + 1;
      END IF;
    END IF;
  END LOOP;
  
  RETURN candidate_code;
END;
$$;