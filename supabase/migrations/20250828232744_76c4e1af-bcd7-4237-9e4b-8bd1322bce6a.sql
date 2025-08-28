-- Create a supervisor function to normalize emails and fix user membership
-- This bypasses RLS policies since it's security definer with supervisor check

CREATE OR REPLACE FUNCTION supervisor_normalize_emails_and_fix_membership()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  updated_count INTEGER := 0;
  total_updates INTEGER := 0;
BEGIN
  -- Verify supervisor permission
  IF NOT is_supervisor() THEN
    RAISE EXCEPTION 'This function requires supervisor privileges';
  END IF;
  
  -- Update lead_email fields to lowercase
  UPDATE family_groups 
  SET lead_email = LOWER(lead_email)
  WHERE lead_email IS NOT NULL AND lead_email != LOWER(lead_email);
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  total_updates := total_updates + updated_count;
  
  -- Update host_members email fields to lowercase within JSONB arrays
  UPDATE family_groups 
  SET host_members = (
    SELECT jsonb_agg(
      CASE 
        WHEN jsonb_typeof(member) = 'object' AND member ? 'email' 
        THEN jsonb_set(member, '{email}', to_jsonb(LOWER(member->>'email')))
        ELSE member
      END
    )
    FROM jsonb_array_elements(COALESCE(host_members, '[]'::jsonb)) AS member
  )
  WHERE host_members IS NOT NULL 
    AND jsonb_typeof(host_members) = 'array'
    AND EXISTS (
      SELECT 1 FROM jsonb_array_elements(host_members) AS member
      WHERE member ? 'email' AND member->>'email' != LOWER(member->>'email')
    );
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  total_updates := total_updates + updated_count;
  
  -- Normalize organization admin/treasurer/calendar keeper emails
  UPDATE organizations 
  SET 
    admin_email = CASE WHEN admin_email IS NOT NULL THEN LOWER(admin_email) ELSE admin_email END,
    treasurer_email = CASE WHEN treasurer_email IS NOT NULL THEN LOWER(treasurer_email) ELSE treasurer_email END,
    calendar_keeper_email = CASE WHEN calendar_keeper_email IS NOT NULL THEN LOWER(calendar_keeper_email) ELSE calendar_keeper_email END
  WHERE admin_email IS NOT NULL OR treasurer_email IS NOT NULL OR calendar_keeper_email IS NOT NULL;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  total_updates := total_updates + updated_count;
  
  -- Add Epsilon Epsilon to user_organizations table
  INSERT INTO user_organizations (user_id, organization_id, role, is_primary, joined_at)
  SELECT 
    u.id,
    'c786936c-6167-451d-9473-1f0ba22d5cfd'::uuid,
    'member',
    true,
    now()
  FROM auth.users u
  WHERE u.email = 'epsilon@alpha.org'
  AND NOT EXISTS (
    SELECT 1 FROM user_organizations uo 
    WHERE uo.user_id = u.id AND uo.organization_id = 'c786936c-6167-451d-9473-1f0ba22d5cfd'::uuid
  );
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  total_updates := total_updates + updated_count;
  
  RETURN format('Email normalization and membership fix completed. Total updates: %s', total_updates);
END;
$$;

-- Create triggers to automatically normalize emails for future inserts/updates
CREATE OR REPLACE FUNCTION normalize_family_group_emails()
RETURNS TRIGGER AS $$
BEGIN
  -- Normalize lead_email
  IF NEW.lead_email IS NOT NULL THEN
    NEW.lead_email = LOWER(NEW.lead_email);
  END IF;
  
  -- Normalize emails in host_members JSONB array
  IF NEW.host_members IS NOT NULL AND jsonb_typeof(NEW.host_members) = 'array' THEN
    NEW.host_members = (
      SELECT jsonb_agg(
        CASE 
          WHEN jsonb_typeof(member) = 'object' AND member ? 'email' 
          THEN jsonb_set(member, '{email}', to_jsonb(LOWER(member->>'email')))
          ELSE member
        END
      )
      FROM jsonb_array_elements(NEW.host_members) AS member
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically normalize emails on family_groups insert/update
DROP TRIGGER IF EXISTS normalize_emails_trigger ON family_groups;
CREATE TRIGGER normalize_emails_trigger
  BEFORE INSERT OR UPDATE ON family_groups
  FOR EACH ROW
  EXECUTE FUNCTION normalize_family_group_emails();

-- Create function to normalize organization emails
CREATE OR REPLACE FUNCTION normalize_organization_emails()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.admin_email IS NOT NULL THEN
    NEW.admin_email = LOWER(NEW.admin_email);
  END IF;
  
  IF NEW.treasurer_email IS NOT NULL THEN
    NEW.treasurer_email = LOWER(NEW.treasurer_email);
  END IF;
  
  IF NEW.calendar_keeper_email IS NOT NULL THEN
    NEW.calendar_keeper_email = LOWER(NEW.calendar_keeper_email);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for organization email normalization
DROP TRIGGER IF EXISTS normalize_org_emails_trigger ON organizations;
CREATE TRIGGER normalize_org_emails_trigger
  BEFORE INSERT OR UPDATE ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION normalize_organization_emails();