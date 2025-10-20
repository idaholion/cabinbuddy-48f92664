import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useSupervisor } from '@/hooks/useSupervisor';
import { useOrgAdmin } from '@/hooks/useOrgAdmin';

type ActiveRole = 'member' | 'supervisor';

interface RoleContextType {
  activeRole: ActiveRole;
  setActiveRole: (role: ActiveRole) => void;
  isSupervisor: boolean;
  isOrgAdmin: boolean;
  canAccessSupervisorFeatures: boolean;
  toggleSupervisorMode: () => void;
  impersonatedFamilyGroup: string | null;
  setImpersonatedFamilyGroup: (familyGroup: string | null) => void;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

interface RoleProviderProps {
  children: ReactNode;
}

export const RoleProvider = ({ children }: RoleProviderProps) => {
  const { isSupervisor } = useSupervisor();
  const { isAdmin: isOrgAdmin } = useOrgAdmin();
  
  // Load saved role preference from localStorage, default to 'member' mode
  const [activeRole, setActiveRoleState] = useState<ActiveRole>(() => {
    const saved = localStorage.getItem('activeRole');
    return (saved === 'supervisor' ? 'supervisor' : 'member') as ActiveRole;
  });

  // Impersonation state (admin-only feature)
  const [impersonatedFamilyGroup, setImpersonatedFamilyGroup] = useState<string | null>(null);

  // Save role preference to localStorage
  const setActiveRole = (role: ActiveRole) => {
    setActiveRoleState(role);
    localStorage.setItem('activeRole', role);
  };

  // If user is not a supervisor, force member mode
  useEffect(() => {
    if (!isSupervisor && activeRole === 'supervisor') {
      setActiveRole('member');
    }
  }, [isSupervisor, activeRole]);

  const canAccessSupervisorFeatures = isSupervisor && activeRole === 'supervisor';

  const toggleSupervisorMode = () => {
    if (!isSupervisor) return;
    setActiveRole(activeRole === 'supervisor' ? 'member' : 'supervisor');
  };

  return (
    <RoleContext.Provider
      value={{
        activeRole,
        setActiveRole,
        isSupervisor,
        isOrgAdmin,
        canAccessSupervisorFeatures,
        toggleSupervisorMode,
        impersonatedFamilyGroup,
        setImpersonatedFamilyGroup,
      }}
    >
      {children}
    </RoleContext.Provider>
  );
};

export const useRole = () => {
  const context = useContext(RoleContext);
  if (context === undefined) {
    throw new Error('useRole must be used within a RoleProvider');
  }
  return context;
};