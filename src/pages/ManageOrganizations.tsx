import { OrganizationSelector } from '@/components/OrganizationSelector';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Building, Eye, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRobustMultiOrganization } from '@/hooks/useRobustMultiOrganization';
import { useEffect } from 'react';

export const ManageOrganizations = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { organizations, loading, error, offline, retry } = useRobustMultiOrganization();

  // Check if we're in debug mode
  const isDebugMode = location.search.includes('debug=true');

  // Redirect logic - users with 0 or 1 organizations shouldn't be here (unless in debug mode)
  useEffect(() => {
    if (!loading && !error && !isDebugMode) {
      if (organizations.length === 0) {
        // Users with no organizations should go to setup, not signup
        navigate('/setup');
      } else if (organizations.length === 1) {
        // Only auto-navigate to home if user isn't in a specific setup process
        const isInSetupProcess = location.pathname.includes('setup') || location.pathname.includes('family');
        if (!isInSetupProcess) {
          navigate('/home');
        }
      }
    }
  }, [organizations, loading, error, navigate, isDebugMode]);

  const handleOrganizationSelected = () => {
    // Only navigate to home if not in a setup process
    const isInSetupProcess = location.pathname.includes('setup') || location.pathname.includes('family');
    if (!isInSetupProcess) {
      navigate('/home');
    }
  };

  // Show loading or error state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="space-y-4 w-full max-w-sm">
          <div className="h-12 w-full bg-muted animate-pulse rounded" />
          <div className="h-12 w-full bg-muted animate-pulse rounded" />
          <div className="h-12 w-full bg-muted animate-pulse rounded" />
        </div>
      </div>
    );
  }

  // Handle error states
  if (error && organizations.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-md">
          <h1 className="text-2xl font-bold text-destructive">
            {offline ? "You're Offline" : "Loading Error"}
          </h1>
          <p className="text-muted-foreground">
            {offline 
              ? "Please check your internet connection and try again."
              : "We couldn't load your organizations. Please try again."
            }
          </p>
          <button 
            onClick={retry}
            className="bg-primary text-primary-foreground px-4 py-2 rounded hover:bg-primary/90"
          >
            Try Again
          </button>
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