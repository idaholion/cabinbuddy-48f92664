import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface SecurityEvent {
  type: 'access_denied' | 'organization_mismatch' | 'permission_error';
  message: string;
  timestamp: Date;
  details?: any;
}

interface SecurityMonitoringData {
  events: SecurityEvent[];
  hasRecentErrors: boolean;
  organizationAccess: {
    hasAccess: boolean;
    organizationId?: string;
    error?: string;
  };
}

export const useSecurityMonitoring = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [securityData, setSecurityData] = useState<SecurityMonitoringData>({
    events: [],
    hasRecentErrors: false,
    organizationAccess: { hasAccess: false }
  });

  // Add flag to prevent security monitoring immediately after signup
  const isRecentSignup = useCallback(() => {
    const signupFlag = localStorage.getItem('recent-signup');
    if (signupFlag) {
      const signupTime = parseInt(signupFlag);
      const now = Date.now();
      return (now - signupTime) < 30000; // 30 second grace period
    }
    return false;
  }, []);

  const logSecurityEvent = useCallback((event: Omit<SecurityEvent, 'timestamp'>) => {
    // Don't show security errors if user just signed up
    if (isRecentSignup()) {
      console.log('🔐 Security event suppressed during signup grace period:', event);
      return;
    }

    const newEvent: SecurityEvent = {
      ...event,
      timestamp: new Date()
    };

    setSecurityData(prev => ({
      ...prev,
      events: [newEvent, ...prev.events.slice(0, 9)], // Keep last 10 events
      hasRecentErrors: true
    }));

    // Show user-friendly error message
    if (event.type === 'access_denied') {
      toast({
        title: "Access Denied",
        description: "You don't have permission to access this resource. Please contact your administrator if you believe this is an error.",
        variant: "destructive",
      });
    } else if (event.type === 'organization_mismatch') {
      toast({
        title: "Organization Access Issue",
        description: "There seems to be an issue with your organization access. Please try refreshing the page or contact support.",
        variant: "destructive",
      });
    }
  }, [toast, isRecentSignup]);

  const checkOrganizationAccess = useCallback(async () => {
    if (!user) {
      setSecurityData(prev => ({
        ...prev,
        organizationAccess: { hasAccess: false, error: 'User not authenticated' }
      }));
      return;
    }

    // Skip security check if user just signed up
    if (isRecentSignup()) {
      console.log('🔐 Organization access check skipped during signup grace period');
      return;
    }

    try {
      // Check if user has access to any organization
      const { data: organizations, error } = await supabase
        .from('user_organizations')
        .select('organization_id, role, is_primary')
        .eq('user_id', user.id);

      if (error) {
        logSecurityEvent({
          type: 'permission_error',
          message: 'Failed to check organization access',
          details: { error: error.message }
        });
        
        setSecurityData(prev => ({
          ...prev,
          organizationAccess: { 
            hasAccess: false, 
            error: 'Failed to verify organization access' 
          }
        }));
        return;
      }

      if (!organizations || organizations.length === 0) {
        logSecurityEvent({
          type: 'organization_mismatch',
          message: 'User has no organization access',
          details: { userId: user.id }
        });
        
        setSecurityData(prev => ({
          ...prev,
          organizationAccess: { 
            hasAccess: false, 
            error: 'No organization access found' 
          }
        }));
        return;
      }

      // Find primary organization or use first one
      const primaryOrg = organizations.find(org => org.is_primary) || organizations[0];
      
      setSecurityData(prev => ({
        ...prev,
        organizationAccess: {
          hasAccess: true,
          organizationId: primaryOrg.organization_id
        }
      }));

    } catch (error) {
      console.error('Security monitoring error:', error);
      logSecurityEvent({
        type: 'permission_error',
        message: 'Unexpected error during security check',
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      });
    }
  }, [user, logSecurityEvent, isRecentSignup]);

  const clearSecurityEvents = useCallback(() => {
    setSecurityData(prev => ({
      ...prev,
      events: [],
      hasRecentErrors: false
    }));
  }, []);

  const emergencyAccessRequest = useCallback(async (reason: string) => {
    if (!user) return false;

    try {
      // Log emergency access request
      const { error } = await supabase
        .from('emergency_access_log')
        .insert({
          user_id: user.id,
          action_type: 'ACCESS_REQUEST',
          reason,
          details: {
            timestamp: new Date().toISOString(),
            userEmail: user.email,
            recentEventsCount: securityData.events.length
          } as any
        });

      if (error) {
        console.error('Failed to log emergency access request:', error);
        return false;
      }

      toast({
        title: "Emergency Access Requested",
        description: "Your request has been logged and will be reviewed by administrators.",
      });

      return true;
    } catch (error) {
      console.error('Emergency access request error:', error);
      return false;
    }
  }, [user, securityData.events, toast]);

  useEffect(() => {
    checkOrganizationAccess();
  }, [checkOrganizationAccess]);

  // Clear recent errors after 5 minutes
  useEffect(() => {
    if (securityData.hasRecentErrors) {
      const timer = setTimeout(() => {
        setSecurityData(prev => ({ ...prev, hasRecentErrors: false }));
      }, 5 * 60 * 1000);

      return () => clearTimeout(timer);
    }
  }, [securityData.hasRecentErrors]);

  return {
    securityData,
    logSecurityEvent,
    checkOrganizationAccess,
    clearSecurityEvents,
    emergencyAccessRequest
  };
};