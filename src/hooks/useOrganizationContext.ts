import { useMultiOrganization } from './useMultiOrganization';

export type AllocationModel = 'rotating_selection' | 'static_weeks' | 'first_come_first_serve' | 'manual' | 'lottery';

/**
 * Hook to safely access organization context with allocation model validation
 * Provides protection against applying wrong booking logic to organizations
 */
export const useOrganizationContext = () => {
  const { activeOrganization } = useMultiOrganization();

  const requireOrganization = () => {
    if (!activeOrganization) {
      throw new Error('No active organization context');
    }
    return activeOrganization;
  };

  const getAllocationModel = (): AllocationModel => {
    const org = requireOrganization();
    // Use new allocation_model column if available
    if (org.allocation_model) {
      return org.allocation_model as AllocationModel;
    }
    // Fallback to legacy use_virtual_weeks_system for backwards compatibility
    return org.use_virtual_weeks_system ? 'static_weeks' : 'rotating_selection';
  };

  const isRotatingSelection = (): boolean => {
    return getAllocationModel() === 'rotating_selection';
  };

  const isStaticWeeks = (): boolean => {
    return getAllocationModel() === 'static_weeks';
  };

  const requireAllocationModel = (required: AllocationModel): void => {
    const current = getAllocationModel();
    if (current !== required) {
      throw new Error(`This operation requires ${required} allocation model, but organization uses ${current}`);
    }
  };

  const isTestOrganization = (): boolean => {
    return activeOrganization?.is_test_organization === true;
  };

  const getOrganizationId = (): string | undefined => {
    return activeOrganization?.organization_id;
  };

  return {
    activeOrganization,
    requireOrganization,
    getAllocationModel,
    isRotatingSelection,
    isStaticWeeks,
    requireAllocationModel,
    isTestOrganization,
    getOrganizationId,
    organizationId: activeOrganization?.organization_id
  };
};
