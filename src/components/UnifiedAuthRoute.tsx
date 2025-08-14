import { ReactNode } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { RobustOrganizationRoute } from '@/components/RobustOrganizationRoute';

interface UnifiedAuthRouteProps {
  children: ReactNode;
  requiresOrganization?: boolean;
}

export const UnifiedAuthRoute = ({ children, requiresOrganization = true }: UnifiedAuthRouteProps) => {
  if (requiresOrganization) {
    return (
      <ProtectedRoute>
        <RobustOrganizationRoute>
          {children}
        </RobustOrganizationRoute>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      {children}
    </ProtectedRoute>
  );
};