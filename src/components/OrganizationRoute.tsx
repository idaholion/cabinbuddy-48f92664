import { ReactNode, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useMultiOrganization } from '@/hooks/useMultiOrganization';
import { Skeleton } from '@/components/ui/skeleton';

interface OrganizationRouteProps {
  children: ReactNode;
}

export const OrganizationRoute = ({ children }: OrganizationRouteProps) => {
  const { user, loading: authLoading } = useAuth();
  const { organizations, loading: orgLoading } = useMultiOrganization();
  const location = useLocation();

  // Skip org check for certain routes
  const exemptRoutes = ['/setup', '/signup', '/login', '/manage-organizations', '/family-group-setup', '/group-member-profile'];
  const isExemptRoute = exemptRoutes.some(route => location.pathname.startsWith(route));

  // Show loading during auth and org checks - CRITICAL: Don't redirect while loading
  if (authLoading || orgLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="space-y-4 w-full max-w-sm">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    );
  }

  // Not authenticated - let ProtectedRoute handle this
  if (!user) {
    return <>{children}</>;
  }

  // Authenticated but on exempt route - allow access
  if (isExemptRoute) {
    return <>{children}</>;
  }

  // Authenticated user with no organizations - redirect to manage organizations
  if (organizations.length === 0) {
    return <Navigate to="/manage-organizations" replace />;
  }

  // Authenticated user with 2+ organizations - always redirect to selection
  if (organizations.length > 1) {
    return <Navigate to="/manage-organizations" replace />;
  }

  // All good - render children
  return <>{children}</>;
};