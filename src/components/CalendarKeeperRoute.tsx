import { ReactNode, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/hooks/useOrganization';
import { Skeleton } from '@/components/ui/skeleton';

interface CalendarKeeperRouteProps {
  children: ReactNode;
}

export const CalendarKeeperRoute = ({ children }: CalendarKeeperRouteProps) => {
  const { user, loading: authLoading } = useAuth();
  const { organization } = useOrganization();
  const [isCalendarKeeper, setIsCalendarKeeper] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkCalendarKeeperStatus = () => {
      if (!user?.email || !organization) {
        setIsCalendarKeeper(false);
        setLoading(false);
        return;
      }

      // Check if user is the calendar keeper for the current organization
      const isKeeper = organization.calendar_keeper_email === user.email;
      setIsCalendarKeeper(isKeeper);
      setLoading(false);
    };

    if (!authLoading && organization) {
      checkCalendarKeeperStatus();
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

  if (!isCalendarKeeper) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};
