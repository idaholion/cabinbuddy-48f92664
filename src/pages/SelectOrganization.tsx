import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { OrganizationSelector } from '@/components/OrganizationSelector';
import { useMultiOrganization } from '@/hooks/useMultiOrganization';

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

  // If no organizations and not loading, stay on this page to let them create/join one
  if (!loading && organizations.length === 0) {
    return <OrganizationSelector onOrganizationSelected={handleOrganizationSelected} />;
  }

  // If multiple organizations, show selector
  if (!loading && organizations.length > 1) {
    return <OrganizationSelector onOrganizationSelected={handleOrganizationSelected} />;
  }

  // Loading state
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
    </div>
  );
};