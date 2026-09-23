import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/hooks/useOrganization';
import { useSupervisor } from '@/hooks/useSupervisor';
import { Skeleton } from '@/components/ui/skeleton';

interface AdminOnlyRouteProps {
  children: ReactNode;
}

/**
 * Strictly organization-admin (or supervisor) pages. Treasurers and regular
 * members are redirected home, even when the organization allows all members
 * financial access.
 */
export const AdminOnlyRoute = ({ children }: AdminOnlyRouteProps) => {
  const { user, loading: authLoading } = useAuth();
  const { organization, loading: orgLoading } = useOrganization();
  const { isSupervisor, loading: supervisorLoading } = useSupervisor();

  if (authLoading || orgLoading || supervisorLoading) {
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

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const userEmail = (user.email || '').toLowerCase();
  const isAdmin = organization?.admin_email?.toLowerCase() === userEmail;

  if (!isAdmin && !isSupervisor) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};
