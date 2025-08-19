import { ReactNode, useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useRobustMultiOrganization } from '@/hooks/useRobustMultiOrganization';
import { LoadingState } from '@/components/ui/loading-spinner';
import { ErrorWithRecovery } from '@/components/ui/error-recovery';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Wifi, WifiOff } from 'lucide-react';
import { SecurityAlert } from '@/components/SecurityAlert';
import { SecurityMonitoringDashboard } from '@/components/SecurityMonitoringDashboard';
import { useSecurityMonitoring } from '@/hooks/useSecurityMonitoring';

interface RobustOrganizationRouteProps {
  children: ReactNode;
}

export const RobustOrganizationRoute = ({ children }: RobustOrganizationRouteProps) => {
  const { user, loading: authLoading } = useAuth();
  const { 
    organizations, 
    loading: orgLoading, 
    error,
    offline,
    retry 
  } = useRobustMultiOrganization();
  const { securityData } = useSecurityMonitoring();
  const location = useLocation();
  const [retryAttempts, setRetryAttempts] = useState(0);

  // Routes that don't require organization checks
  const exemptRoutes = [
    '/setup', 
    '/signup', 
    '/login', 
    '/manage-organizations', 
    '/select-family-group',
    '/auth',
    '/reset-password',
    '/family-setup',
    '/family-group-setup',
    '/host-profile',
    '/financial-setup',
    '/reservation-setup'
  ];
  
  const isExemptRoute = exemptRoutes.some(route => location.pathname.startsWith(route));

  // Handle retry logic
  const handleRetry = () => {
    setRetryAttempts(prev => prev + 1);
    retry();
  };

  // Auto-retry with exponential backoff for network errors
  useEffect(() => {
    if (error && !offline && retryAttempts < 3) {
      const delay = Math.pow(2, retryAttempts) * 1000; // 1s, 2s, 4s
      const timer = setTimeout(() => {
        handleRetry();
      }, delay);
      
      return () => clearTimeout(timer);
    }
  }, [error, offline, retryAttempts]);

  // Show loading state during initial auth and org checks
  if (authLoading || (orgLoading && !error)) {
    console.log('RobustOrganizationRoute - Loading state:', { authLoading, orgLoading, pathname: location.pathname });
    return (
      <LoadingState 
        message="Loading your organizations..." 
        className="min-h-screen" 
      />
    );
  }

  // Debug: Log all state when not loading
  console.log('RobustOrganizationRoute - Current state:', { 
    user: !!user, 
    organizations: organizations.length, 
    error: error?.message,
    offline,
    pathname: location.pathname,
    isExemptRoute
  });

  // Not authenticated - let ProtectedRoute handle this
  if (!user) {
    return <>{children}</>;
  }

  // Authenticated but on exempt route - allow access
  if (isExemptRoute) {
    return <>{children}</>;
  }

  // Handle offline state
  if (offline) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <WifiOff className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <CardTitle>You're Offline</CardTitle>
            <CardDescription>
              Please check your internet connection and try again.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={handleRetry} variant="outline">
              <Wifi className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Handle errors with recovery options
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <ErrorWithRecovery
          error={error}
          title="Organization Loading Error"
          onRetry={handleRetry}
          showHome={true}
          showBack={false}
          showSupport={true}
          className="max-w-md w-full"
        />
      </div>
    );
  }

  // Handle case where organization exists but user might not be properly associated
  if (organizations.length === 0 && !orgLoading && !error) {    
    // Check if this is a setup-related route first
    if (isExemptRoute) {
      return <>{children}</>;
    }
    // For non-exempt routes with no organizations, redirect to setup
    return <Navigate to="/setup" replace />;
  }

  // Authenticated user with multiple organizations but no primary - redirect to manage
  if (organizations.length > 1 && !organizations.find(org => org.is_primary)) {
    return <Navigate to="/manage-organizations" replace />;
  }

  // Show warning if organization data might be stale
  const showStaleDataWarning = organizations.length > 0 && error;

  // All good - render children with optional stale data warning and security monitoring
  return (
    <>
      {showStaleDataWarning && (
        <div className="bg-warning/10 border-b border-warning/20 p-2">
          <div className="max-w-7xl mx-auto flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-warning">
              <AlertTriangle className="h-4 w-4" />
              <span>Some data might be outdated. Check your connection.</span>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleRetry}
              className="text-warning hover:text-warning"
            >
              Refresh
            </Button>
          </div>
        </div>
      )}
      
      {/* Security Monitoring Dashboard - Temporarily disabled for debugging
      <div className="max-w-7xl mx-auto p-4">
        <SecurityMonitoringDashboard />
        
        Security Alerts
        {!securityData.organizationAccess.hasAccess && (
          <SecurityAlert 
            error={securityData.organizationAccess.error || "Organization access verification failed"}
            onRetry={handleRetry}
            showEmergencyAccess={true}
          />
        )}
      </div>
      */}
      
      {children}
    </>
  );
};