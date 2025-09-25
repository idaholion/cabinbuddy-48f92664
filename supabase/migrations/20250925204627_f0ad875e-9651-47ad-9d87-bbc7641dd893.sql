-- Create table to track manual template sends
CREATE TABLE manual_template_sends (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  template_id UUID NOT NULL,
  sent_by_user_id UUID NOT NULL,
  recipient_type TEXT NOT NULL CHECK (recipient_type IN ('all_families', 'selected_families', 'custom_emails')),
  recipients JSONB NOT NULL DEFAULT '[]'::jsonb,
  template_variables JSONB NOT NULL DEFAULT '{}'::jsonb,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  email_subject TEXT NOT NULL,
  email_content TEXT NOT NULL,
  total_recipients INTEGER NOT NULL DEFAULT 0,
  successful_sends INTEGER NOT NULL DEFAULT 0,
  failed_sends INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE manual_template_sends ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can create manual sends for their organization" 
ON manual_template_sends 
FOR INSERT 
WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "Users can view their organization's manual sends" 
ON manual_template_sends 
FOR SELECT 
USING (organization_id = get_user_organization_id());

CREATE POLICY "Supervisors can manage all manual sends" 
ON manual_template_sends 
FOR ALL 
USING (is_supervisor());

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_manual_template_sends_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_manual_template_sends_updated_at
BEFORE UPDATE ON manual_template_sends
FOR EACH ROW
EXECUTE FUNCTION update_manual_template_sends_updated_at();