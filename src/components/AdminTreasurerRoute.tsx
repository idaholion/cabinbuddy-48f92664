import { ReactNode, useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/hooks/useOrganization';
import { useSupervisor } from '@/hooks/useSupervisor';
import { Skeleton } from '@/components/ui/skeleton';

interface AdminTreasurerRouteProps {
  children: ReactNode;
}

export const AdminTreasurerRoute = ({ children }: AdminTreasurerRouteProps) => {
  const { user, loading: authLoading } = useAuth();
  const { organization } = useOrganization();
  const { isSupervisor } = useSupervisor();
  const location = useLocation();
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAccess = () => {
      if (!user?.email || !organization) {
        setHasAccess(false);
        setLoading(false);
        return;
      }

      // SECURITY FIX: Removed debug mode bypass - no URL parameter overrides should allow access

      const userEmail = user.email.toLowerCase();
      
      // Check admin/treasurer access (always allowed)
      const isAdminOrTreasurer = organization.admin_email?.toLowerCase() === userEmail ||
                                organization.treasurer_email?.toLowerCase() === userEmail;
      
      // Check if organization allows all members financial access
      const allowMemberAccess = organization.allow_member_financial_access === true;
      
      // Grant access if: admin/treasurer OR (member access enabled AND user is authenticated)
      const isAuthorized = isAdminOrTreasurer || (allowMemberAccess && !!user);
      
      setHasAccess(isAuthorized);
      setLoading(false);
    };

    if (!authLoading && organization) {
      checkAccess();
    }
  }, [user, organization, authLoading, isSupervisor]);

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