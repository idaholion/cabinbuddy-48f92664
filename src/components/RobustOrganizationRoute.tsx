import { ReactNode, useEffect, useState } from 'react';
import { Navigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useRobustMultiOrganization } from '@/hooks/useRobustMultiOrganization';
import { useSetupState } from '@/hooks/useSetupState';
import { LoadingState } from '@/components/ui/loading-spinner';
import { ErrorWithRecovery } from '@/components/ui/error-recovery';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Wifi, WifiOff, UserCheck } from 'lucide-react';
import { SecurityAlert } from '@/components/SecurityAlert';
import { SecurityMonitoringDashboard } from '@/components/SecurityMonitoringDashboard';
import { useSecurityMonitoring } from '@/hooks/useSecurityMonitoring';
import { useEnhancedProfileClaim } from '@/hooks/useEnhancedProfileClaim';
import { supabase } from '@/integrations/supabase/client';

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
  const { setupState, getSetupRedirectPath, loading: setupLoading } = useSetupState();
  const { securityData } = useSecurityMonitoring();
  const location = useLocation();
  const [retryAttempts, setRetryAttempts] = useState(0);

  // Get active organization
  const activeOrganization = organizations.find(org => org.is_primary);

  // Profile claiming state
  const { claimedProfile, loading: profileLoading } = useEnhancedProfileClaim(
    activeOrganization?.organization_id
  );
  
  const [profileBannerDismissed, setProfileBannerDismissed] = useState(() => {
    const dismissed = localStorage.getItem('profileBannerDismissed');
    return dismissed ? new Date(dismissed) : null;
  });

  const [canClaimProfile, setCanClaimProfile] = useState(false);
  const [matchedGroupName, setMatchedGroupName] = useState<string | null>(null);

  // Routes that don't require organization checks
  const exemptRoutes = [
    '/setup', 
    '/signup', 
    '/login', 
    '/manage-organizations', 
    '/family-setup',
    '/auth',
    '/reset-password',
    '/group-member-profile'  // Add this to prevent redirect
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

  // Check if user's email exists in any family group
  useEffect(() => {
    if (!user?.email || !activeOrganization || profileLoading || claimedProfile) {
      return;
    }

    const checkProfileAvailability = async () => {
      const { data: familyGroups } = await supabase
        .from('family_groups')
        .select('name, lead_email, host_members')
        .eq('organization_id', activeOrganization.organization_id);

      if (!familyGroups) return;

      const userEmail = user.email.toLowerCase();
      
      for (const group of familyGroups) {
        // Check if user is lead
        if (group.lead_email?.toLowerCase() === userEmail) {
          setCanClaimProfile(true);
          setMatchedGroupName(group.name);
          return;
        }
        
        // Check if user is in host_members
        if (group.host_members && Array.isArray(group.host_members)) {
          const members = group.host_members as Array<{ name?: string; email?: string }>;
          for (const member of members) {
            if (member.email?.toLowerCase() === userEmail) {
              setCanClaimProfile(true);
              setMatchedGroupName(group.name);
              return;
            }
          }
        }
      }
    };

    checkProfileAvailability();
  }, [user?.email, activeOrganization, profileLoading, claimedProfile]);

  // Show loading state during initial auth and org checks
  if (authLoading || (orgLoading && !error) || setupLoading) {
    return (
      <LoadingState 
        message="Loading your organizations..." 
        className="min-h-screen" 
      />
    );
  }

  // Not authenticated - let ProtectedRoute handle this
  if (!user) {
    return <>{children}</>;
  }

  // Authenticated but on exempt route - allow access
  if (isExemptRoute) {
    return <>{children}</>;
  }

  // Check if user needs setup flow - but only redirect if they don't have organizations
  if (setupState.isInSetupFlow && organizations.length === 0) {
    const setupPath = getSetupRedirectPath();
    if (setupPath && location.pathname !== setupPath) {
      return <Navigate to={setupPath} replace />;
    }
  }

  // Dismiss profile banner helper
  const dismissProfileBanner = () => {
    const now = new Date();
    localStorage.setItem('profileBannerDismissed', now.toISOString());
    setProfileBannerDismissed(now);
  };

  // Show banner if:
  // 1. No claimed profile
  // 2. Can claim (email matches)
  // 3. Not dismissed in last 24 hours
  // 4. Not on exempt route
  const showProfileBanner = 
    !profileLoading &&
    !claimedProfile &&
    canClaimProfile &&
    (!profileBannerDismissed || new Date() > new Date(profileBannerDismissed.getTime() + 24 * 60 * 60 * 1000)) &&
    !isExemptRoute;

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
    // If user has no organizations and not in setup flow, redirect to setup
    if (!setupState.isInSetupFlow) {
      return <Navigate to="/setup" replace />;
    }
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
      {showProfileBanner && (
        <div className="bg-blue-50 dark:bg-blue-950 border-b border-blue-200 dark:border-blue-800 p-3">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <UserCheck className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <div>
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  Your profile is ready!
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  Link your account to {matchedGroupName} for full access to reservations and settings.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                asChild
                className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600"
              >
                <Link to="/group-member-profile">
                  Claim Profile
                </Link>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={dismissProfileBanner}
                className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
              >
                Later
              </Button>
            </div>
          </div>
        </div>
      )}
      
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