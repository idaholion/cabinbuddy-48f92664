-- Add password_reset as a supported reminder template type
-- This allows organization admins to customize password reset emails

-- First, let's create a default password reset template for existing organizations
INSERT INTO public.reminder_templates (
  organization_id,
  reminder_type,
  subject_template,
  custom_message,
  checklist_items,
  is_active,
  days_in_advance,
  sort_order,
  created_by_user_id
)
SELECT 
  o.id as organization_id,
  'password_reset' as reminder_type,
  'Reset Your {{organization_name}} Password' as subject_template,
  'Hi {{user_name}},

We received a request to reset the password for your {{organization_name}} account.

{{reset_link}}

If you didn''t request this password reset, please ignore this email and contact us if you have concerns.

For assistance, please contact:
{{support_contact}}

This link will expire in 24 hours for security reasons.

Best regards,
{{organization_name}} Team' as custom_message,
  '[]'::jsonb as checklist_items,
  true as is_active,
  null as days_in_advance,
  1000 as sort_order,
  (SELECT id FROM auth.users LIMIT 1) as created_by_user_id
FROM public.organizations o
WHERE NOT EXISTS (
  SELECT 1 FROM public.reminder_templates rt 
  WHERE rt.organization_id = o.id 
  AND rt.reminder_type = 'password_reset'
);

-- Update RLS policies to ensure password reset templates are accessible
-- The existing policies should already cover this, but let's make sure

-- Add a function to get template variables for password reset emails
CREATE OR REPLACE FUNCTION public.get_password_reset_template_variables(
  p_organization_id uuid,
  p_user_name text DEFAULT NULL,
  p_user_email text DEFAULT NULL,
  p_reset_link text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  org_record RECORD;
  support_contact text;
  template_vars jsonb;
BEGIN
  -- Get organization details
  SELECT name, admin_name, admin_email, admin_phone
  INTO org_record
  FROM organizations 
  WHERE id = p_organization_id;
  
  -- Build support contact info (hierarchy: admin email/phone -> generic)
  support_contact := '';
  
  IF org_record.admin_email IS NOT NULL THEN
    support_contact := org_record.admin_email;
    IF org_record.admin_phone IS NOT NULL THEN
      support_contact := support_contact || ' or ' || org_record.admin_phone;
    END IF;
  ELSIF org_record.admin_phone IS NOT NULL THEN
    support_contact := org_record.admin_phone;
  ELSE
    support_contact := 'help@cabinbuddy.org (coming soon)';
  END IF;
  
  -- Build template variables
  template_vars := jsonb_build_object(
    'organization_name', COALESCE(org_record.name, 'Cabin Buddy'),
    'user_name', COALESCE(p_user_name, 'there'),
    'user_email', COALESCE(p_user_email, ''),
    'reset_link', COALESCE(p_reset_link, ''),
    'support_contact', support_contact
  );
  
  RETURN template_vars;
END;
$$;