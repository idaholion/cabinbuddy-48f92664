import React, { useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface AnalyticsEvent {
  event: string;
  properties?: Record<string, any>;
  userId?: string;
  timestamp: number;
  sessionId: string;
  route: string;
}

interface LaunchAnalytics {
  // Core user actions
  trackUserSignup: (method: 'email' | 'social') => void;
  trackUserLogin: (method: 'email' | 'social') => void;
  trackOrganizationCreated: (organizationType: string) => void;
  trackOrganizationJoined: (method: 'code' | 'invitation') => void;
  
  // Key feature usage
  trackReservationCreated: (details: { duration: number; familyGroup: string }) => void;
  trackReservationCanceled: (reason?: string) => void;
  trackReceiptUploaded: (category: string) => void;
  trackFeedbackSubmitted: (type: string) => void;
  
  // Navigation and engagement
  trackPageView: (page: string) => void;
  trackFeatureUsed: (feature: string, context?: Record<string, any>) => void;
  trackError: (error: string, context?: Record<string, any>) => void;
  
  // Critical user flows
  trackOnboardingStep: (step: string, completed: boolean) => void;
  trackSetupComplete: (setupType: 'organization' | 'family' | 'financial' | 'reservation') => void;
}

// Generate session ID for tracking user sessions
const generateSessionId = (): string => {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Get or create session ID
const getSessionId = (): string => {
  const existing = sessionStorage.getItem('analytics_session_id');
  if (existing) return existing;
  
  const newSessionId = generateSessionId();
  sessionStorage.setItem('analytics_session_id', newSessionId);
  return newSessionId;
};

export const useLaunchAnalytics = (): LaunchAnalytics => {
  const { user } = useAuth();

  const trackEvent = useCallback((event: string, properties?: Record<string, any>) => {
    const analyticsEvent: AnalyticsEvent = {
      event,
      properties,
      userId: user?.id,
      timestamp: Date.now(),
      sessionId: getSessionId(),
      route: window.location.pathname,
    };

    // Development logging
    if (process.env.NODE_ENV === 'development') {
      console.group(`📊 Analytics: ${event}`);
      console.log('Properties:', properties);
      console.log('User:', user?.email || 'Anonymous');
      console.log('Route:', window.location.pathname);
      console.groupEnd();
    }

    // In production, send to analytics service
    if (process.env.NODE_ENV === 'production') {
      // Store events locally for now (could send to external service later)
      const events = JSON.parse(localStorage.getItem('cabin_buddy_analytics') || '[]');
      events.push(analyticsEvent);
      
      // Keep only last 1000 events to prevent storage bloat
      if (events.length > 1000) {
        events.splice(0, events.length - 1000);
      }
      
      localStorage.setItem('cabin_buddy_analytics', JSON.stringify(events));
      
      // TODO: Send to external analytics service
      // Example: analytics.track(event, properties);
    }
  }, [user]);

  return {
    // Authentication tracking
    trackUserSignup: useCallback((method: 'email' | 'social') => {
      trackEvent('user_signup', { method });
    }, [trackEvent]),

    trackUserLogin: useCallback((method: 'email' | 'social') => {
      trackEvent('user_login', { method });
    }, [trackEvent]),

    // Organization tracking
    trackOrganizationCreated: useCallback((organizationType: string) => {
      trackEvent('organization_created', { organizationType });
    }, [trackEvent]),

    trackOrganizationJoined: useCallback((method: 'code' | 'invitation') => {
      trackEvent('organization_joined', { method });
    }, [trackEvent]),

    // Feature usage tracking
    trackReservationCreated: useCallback((details: { duration: number; familyGroup: string }) => {
      trackEvent('reservation_created', details);
    }, [trackEvent]),

    trackReservationCanceled: useCallback((reason?: string) => {
      trackEvent('reservation_canceled', { reason });
    }, [trackEvent]),

    trackReceiptUploaded: useCallback((category: string) => {
      trackEvent('receipt_uploaded', { category });
    }, [trackEvent]),

    trackFeedbackSubmitted: useCallback((type: string) => {
      trackEvent('feedback_submitted', { type });
    }, [trackEvent]),

    // Navigation tracking
    trackPageView: useCallback((page: string) => {
      trackEvent('page_view', { page });
    }, [trackEvent]),

    trackFeatureUsed: useCallback((feature: string, context?: Record<string, any>) => {
      trackEvent('feature_used', { feature, ...context });
    }, [trackEvent]),

    trackError: useCallback((error: string, context?: Record<string, any>) => {
      trackEvent('error_occurred', { error, ...context });
    }, [trackEvent]),

    // User flow tracking
    trackOnboardingStep: useCallback((step: string, completed: boolean) => {
      trackEvent('onboarding_step', { step, completed });
    }, [trackEvent]),

    trackSetupComplete: useCallback((setupType: 'organization' | 'family' | 'financial' | 'reservation') => {
      trackEvent('setup_complete', { setupType });
    }, [trackEvent]),
  };
};

// Hook for automatic page view tracking
export const usePageTracking = () => {
  const { trackPageView } = useLaunchAnalytics();

  React.useEffect(() => {
    // Track initial page view
    trackPageView(window.location.pathname);

    // Track page views on route changes
    const handleRouteChange = () => {
      trackPageView(window.location.pathname);
    };

    // Listen for browser back/forward navigation
    window.addEventListener('popstate', handleRouteChange);

    return () => {
      window.removeEventListener('popstate', handleRouteChange);
    };
  }, [trackPageView]);
};

// Utility to get analytics data (for debugging/support)
export const getAnalyticsData = (): AnalyticsEvent[] => {
  if (typeof window === 'undefined') return [];
  
  try {
    return JSON.parse(localStorage.getItem('cabin_buddy_analytics') || '[]');
  } catch {
    return [];
  }
};

// Utility to clear analytics data
export const clearAnalyticsData = (): void => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('cabin_buddy_analytics');
    sessionStorage.removeItem('analytics_session_id');
  }
};
