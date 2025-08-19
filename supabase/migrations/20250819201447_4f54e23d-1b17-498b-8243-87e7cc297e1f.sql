-- Create default_features table for public intro page
CREATE TABLE public.default_features (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  feature_key TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('host', 'admin')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.default_features ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view active default features" 
ON public.default_features 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Supervisors can manage all default features" 
ON public.default_features 
FOR ALL 
USING (is_supervisor());

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_default_features_updated_at
BEFORE UPDATE ON public.default_features
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default features for the intro page
INSERT INTO public.default_features (feature_key, title, description, icon, category, sort_order) VALUES
('calendar_management', 'Calendar Management', 'Fair and transparent scheduling system with rotation-based booking to ensure every family gets their time.', 'calendar', 'host', 1),
('financial_tracking', 'Financial Tracking', 'Track expenses, split costs, and manage payments with detailed receipts and automatic calculations.', 'dollarsign', 'admin', 2),
('family_coordination', 'Family Coordination', 'Manage family groups, assign responsibilities, and coordinate activities across multiple generations.', 'users', 'host', 3),
('photo_sharing', 'Photo Sharing', 'Share memories with secure photo galleries, comments, and easy downloading for the whole family.', 'camera', 'host', 4),
('documentation', 'Documentation & Rules', 'Store cabin rules, guides, seasonal documents, and important information in one organized place.', 'bookopen', 'host', 5),
('maintenance_tracking', 'Maintenance & Work Weekends', 'Coordinate work weekends, track maintenance tasks, and ensure everyone contributes fairly.', 'wrench', 'admin', 6),
('messaging', 'Communication Hub', 'Built-in messaging system to keep all family communications organized and accessible.', 'messagesquare', 'host', 7),
('admin_controls', 'Administrative Controls', 'Comprehensive admin tools for user management, settings, and organization-wide configurations.', 'settings', 'admin', 8),
('voting_system', 'Family Voting', 'Democratic decision-making with weighted voting system based on ownership shares and participation.', 'vote', 'admin', 9),
('checkin_system', 'Check-in & Surveys', 'Streamlined check-in process with customizable checklists and feedback collection.', 'clipboardcheck', 'host', 10);