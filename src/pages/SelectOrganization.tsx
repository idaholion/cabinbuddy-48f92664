import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { OrganizationSelector } from '@/components/OrganizationSelector';
import { useMultiOrganization } from '@/hooks/useMultiOrganization';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Home, Building } from 'lucide-react';

export const SelectOrganization = () => {
  const navigate = useNavigate();
  const { organizations, activeOrganization, loading } = useMultiOrganization();

  const handleOrganizationSelected = () => {
    // Navigate to the main app after organization is selected
    navigate('/');
  };

  // If user has only one organization, skip this page and go directly to it
  useEffect(() => {
    if (!loading && organizations.length === 1 && activeOrganization) {
      navigate('/');
    }
  }, [loading, organizations, activeOrganization, navigate]);

  const showBackButton = activeOrganization !== null;

  // If no organizations and not loading, redirect to onboarding
  if (!loading && organizations.length === 0) {
    navigate('/onboarding');
    return null;
  }

  // If multiple organizations, show selector with navigation
  if (!loading && organizations.length > 0) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">Switch Organizations</h1>
              <p className="text-muted-foreground">
                You're a member of multiple organizations. Choose which one you'd like to access, or manage your organization memberships.
              </p>
            </div>
            {showBackButton && (
              <Button variant="outline" asChild>
                <Link to="/">
                  <Home className="h-4 w-4 mr-2" />
                  Back to Dashboard
                </Link>
              </Button>
            )}
          </div>
          <OrganizationSelector 
            onOrganizationSelected={handleOrganizationSelected}
            showBackButton={showBackButton}
            onBack={() => navigate('/')}
          />
        </div>
      </div>
    );
  }

  // Loading state
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
    </div>
  );
};