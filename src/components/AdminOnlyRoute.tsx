import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useOrgAdmin } from '@/hooks/useOrgAdmin';
import { useSupervisor } from '@/hooks/useSupervisor';
import { Skeleton } from '@/components/ui/skeleton';

interface AdminOnlyRouteProps {
  children: ReactNode;
}

/**
 * Strictly organization-admin (or supervisor) pages. Uses the server-side
 * org-admin check and waits for it to resolve before deciding, so admins are
 * not bounced home while organization data is still loading.
 */
export const AdminOnlyRoute = ({ children }: AdminOnlyRouteProps) => {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useOrgAdmin();
  const { isSupervisor, loading: supervisorLoading } = useSupervisor();

  if (authLoading || (user && (adminLoading || supervisorLoading))) {
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

  if (!isAdmin && !isSupervisor) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};
