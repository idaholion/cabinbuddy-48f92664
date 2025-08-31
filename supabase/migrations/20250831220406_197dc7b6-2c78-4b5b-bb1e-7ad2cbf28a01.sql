-- Create function to sync profile updates to family group leads
CREATE OR REPLACE FUNCTION public.sync_profile_to_family_group_lead()
RETURNS TRIGGER AS $$
DECLARE
  user_email TEXT;
BEGIN
  -- Get the user's email from auth.users
  SELECT email INTO user_email 
  FROM auth.users 
  WHERE id = NEW.user_id;
  
  -- If no email found, skip sync
  IF user_email IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Update family groups where this user is the lead
  UPDATE family_groups 
  SET 
    lead_name = CASE 
      WHEN NEW.display_name IS NOT NULL THEN NEW.display_name
      WHEN NEW.first_name IS NOT NULL AND NEW.last_name IS NOT NULL 
        THEN NEW.first_name || ' ' || NEW.last_name
      ELSE lead_name
    END,
    updated_at = now()
  WHERE lead_email = user_email 
    AND organization_id = NEW.organization_id;
    
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;