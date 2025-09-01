-- Add organization setting to allow member financial access
ALTER TABLE organizations 
ADD COLUMN allow_member_financial_access boolean DEFAULT false;

COMMENT ON COLUMN organizations.allow_member_financial_access 
IS 'When true, allows all organization members to access financial dashboard. When false, only admin and treasurer have access.';