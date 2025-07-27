import { ReactNode, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';

interface SupervisorRouteProps {
  children: ReactNode;
}

export const SupervisorRoute = ({ children }: SupervisorRouteProps) => {
  const { user, loading: authLoading } = useAuth();
  const [isSupervisor, setIsSupervisor] = useState(false);
  const [loading, setLoading] = useState(true);

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

    if (!authLoading) {
      checkSupervisorStatus();
    }
  }, [user, authLoading]);

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