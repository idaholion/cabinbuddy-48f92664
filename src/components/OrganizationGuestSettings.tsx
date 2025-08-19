import { GuestAccessSettings } from '@/components/GuestAccessSettings';
import { useRobustMultiOrganization } from '@/hooks/useRobustMultiOrganization';

export const OrganizationGuestSettings = () => {
  const { activeOrganization } = useRobustMultiOrganization();

  if (!activeOrganization?.organization_id) {
    return null;
  }

  return <GuestAccessSettings organizationId={activeOrganization.organization_id} />;
};