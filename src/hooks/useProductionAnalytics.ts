import { useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface AnalyticsEvent {
  event: string;
  properties?: Record<string, any>;
  userId?: string;
  sessionId?: string;
  timestamp: number;
}

interface PerformanceMetrics {
  pageLoadTime: number;
  domContentLoaded: number;
  firstContentfulPaint?: number;
  largestContentfulPaint?: number;
  cumulativeLayoutShift?: number;
  timeToInteractive?: number;
}

class ProductionAnalytics {
  private isProduction: boolean;
  private userId?: string;
  private sessionId: string;
  private events: AnalyticsEvent[] = [];
  private batchSize = 10;
  private flushInterval = 30000; // 30 seconds

  constructor() {
    this.isProduction = process.env.NODE_ENV === 'production';
    this.sessionId = this.generateSessionId();
    this.startBatchTimer();
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  setUserId(userId: string) {
    this.userId = userId;
  }

  track(event: string, properties?: Record<string, any>) {
    const analyticsEvent: AnalyticsEvent = {
      event,
      properties: {
        ...properties,
        url: window.location.pathname,
        referrer: document.referrer,
        userAgent: navigator.userAgent,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight,
        },
      },
      userId: this.userId,
      sessionId: this.sessionId,
      timestamp: Date.now(),
    };

    this.events.push(analyticsEvent);

    if (this.events.length >= this.batchSize) {
      this.flush();
    }

    // Console log for development
    if (!this.isProduction) {
      console.log('Analytics Event:', analyticsEvent);
    }
  }

  trackPerformance(metrics: PerformanceMetrics) {
    this.track('performance_metrics', {
      pageLoadTime: metrics.pageLoadTime,
      domContentLoaded: metrics.domContentLoaded,
      firstContentfulPaint: metrics.firstContentfulPaint,
      largestContentfulPaint: metrics.largestContentfulPaint,
      cumulativeLayoutShift: metrics.cumulativeLayoutShift,
      timeToInteractive: metrics.timeToInteractive,
    });
  }

  trackError(error: Error, context?: string, additionalData?: Record<string, any>) {
    this.track('error', {
      message: error.message,
      stack: error.stack,
      context,
      ...additionalData,
    });
  }

  private async flush() {
    if (this.events.length === 0) return;

    const eventsToSend = [...this.events];
    this.events = [];

    if (this.isProduction) {
      try {
        // In production, send to your analytics service
        // Example: await fetch('/api/analytics', { ... })
        await this.sendToAnalyticsService(eventsToSend);
      } catch (error) {
        console.error('Failed to send analytics:', error);
        // Re-add events to queue for retry
        this.events.unshift(...eventsToSend);
      }
    }
  }

  private async sendToAnalyticsService(events: AnalyticsEvent[]) {
    // Placeholder for production analytics service integration
    // Replace with your actual analytics service (e.g., Google Analytics, Mixpanel, etc.)
    
    // Example implementation for a custom analytics endpoint:
    /*
    const response = await fetch('/api/analytics/batch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ events }),
    });

    if (!response.ok) {
      throw new Error('Failed to send analytics data');
    }
    */

    // For now, just log to console in production
    console.log('Production Analytics Batch:', events);
  }

  private startBatchTimer() {
    setInterval(() => {
      this.flush();
    }, this.flushInterval);
  }

  // Flush on page unload
  setupPageUnloadTracking() {
    window.addEventListener('beforeunload', () => {
      this.flush();
    });

    // Use Page Visibility API for better tracking
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.flush();
      }
    });
  }
}

// Global analytics instance
const analytics = new ProductionAnalytics();

export const useProductionAnalytics = () => {
  const { user } = useAuth();

  useEffect(() => {
    if (user?.id) {
      analytics.setUserId(user.id);
    }
  }, [user?.id]);

  useEffect(() => {
    analytics.setupPageUnloadTracking();
  }, []);

  const trackEvent = useCallback((event: string, properties?: Record<string, any>) => {
    analytics.track(event, properties);
  }, []);

  const trackPageView = useCallback((page: string) => {
    analytics.track('page_view', { page });
  }, []);

  const trackUserAction = useCallback((action: string, details?: Record<string, any>) => {
    analytics.track('user_action', { action, ...details });
  }, []);

  const trackPerformanceMetrics = useCallback((metrics: PerformanceMetrics) => {
    analytics.trackPerformance(metrics);
  }, []);

  const trackError = useCallback((error: Error, context?: string, additionalData?: Record<string, any>) => {
    analytics.trackError(error, context, additionalData);
  }, []);

  return {
    trackEvent,
    trackPageView,
    trackUserAction,
    trackPerformanceMetrics,
    trackError,
  };
};

export { analytics };