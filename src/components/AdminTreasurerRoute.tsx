import { ReactNode, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/hooks/useOrganization';
import { Skeleton } from '@/components/ui/skeleton';

interface AdminTreasurerRouteProps {
  children: ReactNode;
}

export const AdminTreasurerRoute = ({ children }: AdminTreasurerRouteProps) => {
  const { user, loading: authLoading } = useAuth();
  const { organization } = useOrganization();
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAccess = () => {
      if (!user?.email || !organization) {
        setHasAccess(false);
        setLoading(false);
        return;
      }

      // Only admin and treasurer have access to financial features
      const userEmail = user.email.toLowerCase();
      const isAuthorized = organization.admin_email?.toLowerCase() === userEmail ||
                          organization.treasurer_email?.toLowerCase() === userEmail;
      
      setHasAccess(isAuthorized);
      setLoading(false);
    };

    if (!authLoading && organization) {
      checkAccess();
    }
  }, [user, organization, authLoading]);

  if (authLoading || loading) {
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

  if (!hasAccess) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};