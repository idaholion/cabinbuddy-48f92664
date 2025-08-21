import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useRole } from '@/contexts/RoleContext';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield } from 'lucide-react';

interface ProtectedSupervisorRouteProps {
  children: ReactNode;
}

export const ProtectedSupervisorRoute = ({ children }: ProtectedSupervisorRouteProps) => {
  const { canAccessSupervisorFeatures, isSupervisor, activeRole } = useRole();
  const location = useLocation();

  // If user is not a supervisor at all, redirect to home
  if (!isSupervisor) {
    return <Navigate to="/home" replace />;
  }

  // If supervisor is in member mode, show access denied
  if (!canAccessSupervisorFeatures) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription className="flex flex-col gap-2">
            <strong>Supervisor Mode Required</strong>
            <p>
              You need to enable Supervisor Mode to access this page. 
              Use the toggle in the sidebar to switch from Administrator Mode to Supervisor Mode.
            </p>
            <p className="text-sm text-muted-foreground">
              Current mode: {activeRole === 'member' ? 'Administrator Mode' : 'Supervisor Mode'}
            </p>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return <>{children}</>;
};