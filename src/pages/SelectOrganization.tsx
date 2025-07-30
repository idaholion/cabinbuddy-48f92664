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

  // If no organizations and not loading, show welcome screen for new users
  if (!loading && organizations.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto text-center mb-8">
            <h1 className="text-4xl font-bold mb-4">Welcome to Cabin Buddy!</h1>
            <p className="text-lg text-muted-foreground mb-6">
              We don't see you as a Cabin Buddy member yet. No worries! You can either:
            </p>
            <div className="grid md:grid-cols-2 gap-6 mt-8">
              <div className="p-6 border rounded-lg bg-card">
                <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-primary/10 rounded-full">
                  <Home className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Join Existing Group</h3>
                <p className="text-muted-foreground text-sm">
                  Already know someone using Cabin Buddy? Get their organization code and join their group.
                </p>
              </div>
              <div className="p-6 border rounded-lg bg-card">
                <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-primary/10 rounded-full">
                  <Building className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Create New Organization</h3>
                <p className="text-muted-foreground text-sm">
                  Start fresh with your own cabin sharing group and invite others to join.
                </p>
              </div>
            </div>
          </div>
          <OrganizationSelector 
            onOrganizationSelected={handleOrganizationSelected}
            showBackButton={false}
          />
        </div>
      </div>
    );
  }

  // If multiple organizations, show selector with navigation
  if (!loading && organizations.length > 0) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">Manage Organizations</h1>
              <p className="text-muted-foreground">
                Switch between organizations, join new ones, or create additional organizations.
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