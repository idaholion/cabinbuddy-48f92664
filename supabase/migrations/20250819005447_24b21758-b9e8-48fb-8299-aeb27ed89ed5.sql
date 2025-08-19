-- Create features table for editable feature descriptions
CREATE TABLE public.features (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  feature_key TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('host', 'admin')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(organization_id, feature_key)
);

-- Enable Row Level Security
ALTER TABLE public.features ENABLE ROW LEVEL SECURITY;

-- Create policies for features
CREATE POLICY "Users can view features for their organization" 
ON public.features 
FOR SELECT 
USING (
  organization_id IN (
    SELECT organization_id 
    FROM public.organization_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage features for their organization" 
ON public.features 
FOR ALL
USING (
  organization_id IN (
    SELECT organization_id 
    FROM public.organization_members 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'treasurer')
  )
);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_features_updated_at
BEFORE UPDATE ON public.features
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default features for existing organizations
INSERT INTO public.features (organization_id, feature_key, title, description, icon, category, sort_order)
SELECT 
  o.id as organization_id,
  unnest(ARRAY[
    'calendar-reservations', 'financial-dashboard', 'work-weekends', 'receipts-expenses',
    'shopping-lists', 'documents', 'seasonal-documents', 'family-voting',
    'photo-sharing', 'communication', 'check-in-out'
  ]) as feature_key,
  unnest(ARRAY[
    'Calendar & Reservations', 'Financial Dashboard', 'Work Weekends', 'Receipts & Expenses',
    'Shopping Lists', 'Documents', 'Seasonal Documents', 'Family Voting',
    'Photo Sharing', 'Communication', 'Check-in/Check-out'
  ]) as title,
  unnest(ARRAY[
    'Book your family stays, view availability, and see everyone''s scheduled visits',
    'Track your stay costs, view payment summaries, and monitor your family''s expenses',
    'Sign up for property maintenance weekends and coordinate with other families',
    'Upload receipt photos, track shared cabin expenses, and split costs fairly',
    'Coordinate cabin supplies with other families and check off completed purchases',
    'Access important cabin papers, maintenance guides, and family agreements',
    'View opening/closing checklists and seasonal maintenance procedures',
    'Participate in family decisions and cast votes on important proposals',
    'Upload memories from your stays and view photos shared by other families',
    'Stay connected with family messaging, notifications, and important updates',
    'Use digital checklists and report property conditions for each stay'
  ]) as description,
  unnest(ARRAY[
    'Calendar', 'DollarSign', 'Wrench', 'Receipt',
    'ShoppingCart', 'FileText', 'Snowflake', 'Vote',
    'Camera', 'MessageCircle', 'CheckSquare'
  ]) as icon,
  'host' as category,
  generate_series(1, 11) as sort_order
FROM public.organizations o;

-- Insert admin features
INSERT INTO public.features (organization_id, feature_key, title, description, icon, category, sort_order)
SELECT 
  o.id as organization_id,
  unnest(ARRAY[
    'family-group-management', 'financial-setup', 'property-settings',
    'google-calendar-integration', 'reports-analytics', 'system-administration'
  ]) as feature_key,
  unnest(ARRAY[
    'Family Group Management', 'Financial Setup', 'Property Settings',
    'Google Calendar Integration', 'Reports & Analytics', 'System Administration'
  ]) as title,
  unnest(ARRAY[
    'Set up families, assign group leads, and manage member permissions',
    'Configure billing rates, late fees, and expense categories for the property',
    'Manage reservation rules, calendar settings, and property-specific configurations',
    'One-way sync from CabinBuddy to your family''s shared Google Calendar',
    'View usage statistics, financial reports, and family engagement metrics',
    'Manage user access, organization settings, and system-wide configurations'
  ]) as description,
  unnest(ARRAY[
    'Users', 'Settings', 'Home',
    'CalendarPlus', 'BarChart3', 'Shield'
  ]) as icon,
  'admin' as category,
  generate_series(1, 6) as sort_order
FROM public.organizations o;