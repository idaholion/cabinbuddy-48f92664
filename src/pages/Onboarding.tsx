import { OrganizationSelector } from '@/components/OrganizationSelector';
import { useNavigate } from 'react-router-dom';
import { Home, Building, Eye, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMultiOrganization } from '@/hooks/useMultiOrganization';
import { useEffect } from 'react';

export const Onboarding = () => {
  const navigate = useNavigate();
  const { organizations, loading } = useMultiOrganization();

  // Redirect if user has 0 or 1 organizations (shouldn't be on onboarding)
  useEffect(() => {
    if (!loading) {
      if (organizations.length === 0) {
        // No organizations - redirect to signup
        navigate('/signup');
      } else if (organizations.length === 1) {
        // Only one organization - go straight to home
        navigate('/home');
      }
    }
  }, [organizations, loading, navigate]);

  const handleOrganizationSelected = () => {
    // Navigate to the main app after organization is selected
    navigate('/home');
  };

  // Show loading while checking organizations
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading your organizations...</p>
        </div>
      </div>
    );
  }

  // If we get here, user has 2+ organizations
  if (organizations.length < 2) {
    return null; // Will redirect via useEffect
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Temporary Design Review Button */}
      <div className="fixed top-4 right-4 z-50">
        <Button 
          onClick={() => navigate('/')} 
          variant="outline"
          size="sm"
          className="bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <Eye className="h-4 w-4 mr-2" />
          View Landing Page
        </Button>
      </div>
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto text-center mb-8">
          <h1 className="text-6xl mb-4 font-kaushan text-primary drop-shadow-lg text-center">Choose Your Organization</h1>
          <p className="text-lg text-muted-foreground mb-6">
            You're a member of multiple cabin sharing groups. Which one would you like to access today?
          </p>
          <div className="p-6 border rounded-lg bg-card">
            <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-primary/10 rounded-full">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Multi-Organization Access</h3>
            <p className="text-muted-foreground text-sm">
              Select from your organizations below, or add a new one if needed.
            </p>
          </div>
        </div>
        <OrganizationSelector 
          onOrganizationSelected={handleOrganizationSelected}
          showBackButton={false}
          mode="selection"
        />
      </div>
    </div>
  );
};