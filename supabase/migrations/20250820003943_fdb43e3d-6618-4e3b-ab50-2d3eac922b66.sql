-- Create missing get_user_organizations function
CREATE OR REPLACE FUNCTION get_user_organizations()
RETURNS TABLE (
  organization_id uuid,
  organization_name text,
  organization_code text,
  role text,
  is_primary boolean,
  joined_at timestamp with time zone
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    uo.organization_id,
    o.name as organization_name,
    o.code as organization_code,
    uo.role,
    uo.is_primary,
    uo.joined_at
  FROM user_organizations uo
  JOIN organizations o ON uo.organization_id = o.id
  WHERE uo.user_id = auth.uid()
  ORDER BY uo.is_primary DESC, uo.joined_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;