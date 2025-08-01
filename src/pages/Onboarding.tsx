import { OrganizationSelector } from '@/components/OrganizationSelector';
import { useNavigate } from 'react-router-dom';
import { Home, Building } from 'lucide-react';

export const Onboarding = () => {
  const navigate = useNavigate();

  const handleOrganizationSelected = () => {
    // Navigate to the main app after organization is selected
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto text-center mb-8">
          <h1 className="text-6xl mb-4 font-kaushan text-primary drop-shadow-lg text-center">Welcome to Cabin Buddy!</h1>
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
};