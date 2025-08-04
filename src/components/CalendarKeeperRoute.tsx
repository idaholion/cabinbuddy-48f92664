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
      console.log('Calendar Keeper Access Check:', {
        userEmail: user?.email,
        organization: organization,
        calendarKeeperEmail: organization?.calendar_keeper_email,
        adminEmail: organization?.admin_email,
        treasurerEmail: organization?.treasurer_email
      });

      if (!user?.email || !organization) {
        console.log('Access denied: Missing user email or organization');
        setIsCalendarKeeper(false);
        setLoading(false);
        return;
      }

      // Check if user is the calendar keeper OR an admin/treasurer for the current organization
      // Use case-insensitive email comparison
      const userEmail = user.email.toLowerCase();
      const isKeeper = organization.calendar_keeper_email?.toLowerCase() === userEmail ||
                       organization.admin_email?.toLowerCase() === userEmail ||
                       organization.treasurer_email?.toLowerCase() === userEmail;
      
      console.log('Calendar Keeper Access Result:', {
        isKeeper,
        matchesCalendarKeeper: organization.calendar_keeper_email === user.email,
        matchesAdmin: organization.admin_email === user.email,
        matchesTreasurer: organization.treasurer_email === user.email
      });
      
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
