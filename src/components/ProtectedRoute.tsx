import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { useProductionLogger } from '@/hooks/useProductionLogger';

interface ProtectedRouteProps {
  children: ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, loading } = useAuth();
  const { logInfo } = useProductionLogger();

  console.log('🔒 ProtectedRoute check:', { 
    hasUser: !!user, 
    loading, 
    userId: user?.id,
    userEmail: user?.email 
  });

  // Show loading only during initial auth check to prevent flashing
  if (loading) {
    console.log('🔒 ProtectedRoute - showing loading state');
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
    console.log('🔒 ProtectedRoute - No user found, redirecting to login');
    logInfo('ProtectedRoute - No user found, redirecting to login', {}, { component: 'ProtectedRoute' });
    return <Navigate to="/login" replace />;
  }

  console.log('🔒 ProtectedRoute - User authenticated, showing children');
  logInfo('ProtectedRoute - User authenticated', { userId: user.id }, { component: 'ProtectedRoute' });
  return <>{children}</>;
};