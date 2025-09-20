-- Create trial access codes table for controlling new organization creation
CREATE TABLE public.trial_access_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  used_at TIMESTAMP WITH TIME ZONE NULL,
  used_by_user_id UUID NULL,
  created_by_user_id UUID NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMP WITH TIME ZONE NULL,
  notes TEXT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.trial_access_codes ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Supervisors can manage all trial codes"
ON public.trial_access_codes
FOR ALL
USING (is_supervisor())
WITH CHECK (is_supervisor());

CREATE POLICY "Anyone can validate unused trial codes"  
ON public.trial_access_codes
FOR SELECT
USING (is_active = true AND used_at IS NULL AND (expires_at IS NULL OR expires_at > now()));

-- Function to validate trial code
CREATE OR REPLACE FUNCTION public.validate_trial_code(p_code text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  code_exists BOOLEAN := false;
BEGIN
  -- Check if code exists, is active, unused, and not expired
  SELECT EXISTS(
    SELECT 1 FROM trial_access_codes 
    WHERE code = UPPER(p_code)
      AND is_active = true
      AND used_at IS NULL
      AND (expires_at IS NULL OR expires_at > now())
  ) INTO code_exists;
  
  RETURN code_exists;
END;
$function$;

-- Function to consume trial code when organization is created
CREATE OR REPLACE FUNCTION public.consume_trial_code(p_code text, p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  code_found BOOLEAN := false;
BEGIN
  -- Mark code as used atomically
  UPDATE trial_access_codes 
  SET 
    used_at = now(),
    used_by_user_id = p_user_id,
    updated_at = now()
  WHERE code = UPPER(p_code)
    AND is_active = true
    AND used_at IS NULL
    AND (expires_at IS NULL OR expires_at > now());
    
  GET DIAGNOSTICS code_found = FOUND;
  
  RETURN code_found;
END;
$function$;

-- Function for supervisors to create trial codes
CREATE OR REPLACE FUNCTION public.create_trial_code(p_notes text DEFAULT NULL, p_expires_days integer DEFAULT NULL)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN := true;
  expiry_date TIMESTAMP WITH TIME ZONE := NULL;
BEGIN
  -- Only supervisors can create codes
  IF NOT is_supervisor() THEN
    RAISE EXCEPTION 'Access denied: Only supervisors can create trial codes';
  END IF;
  
  -- Set expiry date if specified
  IF p_expires_days IS NOT NULL THEN
    expiry_date := now() + (p_expires_days || ' days')::INTERVAL;
  END IF;
  
  -- Generate unique code
  WHILE code_exists LOOP
    -- Generate 8-character code
    new_code := UPPER(substring(md5(random()::text) from 1 for 8));
    
    -- Check if code already exists
    SELECT EXISTS(
      SELECT 1 FROM trial_access_codes WHERE code = new_code
    ) INTO code_exists;
  END LOOP;
  
  -- Insert new code
  INSERT INTO trial_access_codes (
    code,
    created_by_user_id,
    notes,
    expires_at
  ) VALUES (
    new_code,
    auth.uid(),
    p_notes,
    expiry_date
  );
  
  RETURN new_code;
END;
$function$;

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION public.update_trial_codes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_trial_access_codes_updated_at
  BEFORE UPDATE ON public.trial_access_codes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_trial_codes_updated_at();