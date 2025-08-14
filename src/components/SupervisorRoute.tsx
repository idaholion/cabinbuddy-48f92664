import { ReactNode, useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';

interface SupervisorRouteProps {
  children: ReactNode;
}

export const SupervisorRoute = ({ children }: SupervisorRouteProps) => {
  const { user, loading: authLoading } = useAuth();
  const location = useLocation();
  const [isSupervisor, setIsSupervisor] = useState(false);
  const [loading, setLoading] = useState(true);

  // Check if we're in debug mode
  const isDebugMode = location.search.includes('debug=true');

  useEffect(() => {
    const checkSupervisorStatus = async () => {
      if (!user?.email) {
        setIsSupervisor(false);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('supervisors')
          .select('*')
          .eq('email', user.email)
          .eq('is_active', true)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Error checking supervisor status:', error);
          setIsSupervisor(false);
        } else {
          setIsSupervisor(!!data);
        }
      } catch (error) {
        console.error('Error checking supervisor status:', error);
        setIsSupervisor(false);
      } finally {
        setLoading(false);
      }
    };

    // In debug mode, allow access if user exists (DebugRoute will verify supervisor status)
    if (isDebugMode && user) {
      setIsSupervisor(true);
      setLoading(false);
      return;
    }

    if (!authLoading) {
      checkSupervisorStatus();
    }
  }, [user, authLoading, isDebugMode]);

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

  if (!isSupervisor) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};