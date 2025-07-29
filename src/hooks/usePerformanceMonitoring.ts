import { useEffect } from 'react';

interface PerformanceMetrics {
  pageLoadTime: number;
  domContentLoaded: number;
  firstContentfulPaint?: number;
  largestContentfulPaint?: number;
  interactionToNextPaint?: number;
}

export const usePerformanceMonitoring = () => {
  useEffect(() => {
    const trackPerformance = () => {
      if (typeof window === 'undefined' || !window.performance) return;

      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      
      const metrics: PerformanceMetrics = {
        pageLoadTime: navigation.loadEventEnd - navigation.loadEventStart,
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
      };

      // Track Web Vitals if available
      if ('PerformanceObserver' in window) {
        // First Contentful Paint
        const fcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const fcp = entries.find(entry => entry.name === 'first-contentful-paint');
          if (fcp) {
            metrics.firstContentfulPaint = fcp.startTime;
          }
        });
        
        try {
          fcpObserver.observe({ entryTypes: ['paint'] });
        } catch (e) {
          // Paint timing not supported
        }

        // Largest Contentful Paint
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          if (lastEntry) {
            metrics.largestContentfulPaint = lastEntry.startTime;
          }
        });
        
        try {
          lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
        } catch (e) {
          // LCP not supported
        }
      }

      // Log performance metrics (in production, send to analytics)
      setTimeout(() => {
        console.log('Performance Metrics:', metrics);
      }, 2000);
    };

    // Track performance after the page has loaded
    if (document.readyState === 'complete') {
      trackPerformance();
    } else {
      window.addEventListener('load', trackPerformance);
    }

    return () => {
      window.removeEventListener('load', trackPerformance);
    };
  }, []);
};

export const trackUserAction = (action: string, details?: Record<string, any>) => {
  const actionData = { action, details, timestamp: Date.now() };
  console.log('User Action:', actionData);
  
  // In production, send to analytics service
  if (typeof window !== 'undefined' && (window as any).analytics) {
    (window as any).analytics.track('user_action', actionData);
  }
};

export const trackError = (error: Error, context?: string, additionalData?: Record<string, any>) => {
  const errorData = { 
    message: error.message, 
    stack: error.stack, 
    context,
    timestamp: Date.now(),
    url: typeof window !== 'undefined' ? window.location.pathname : '',
    userAgent: typeof window !== 'undefined' ? navigator.userAgent : '',
    ...additionalData
  };
  
  console.error('Tracked Error:', errorData);
  
  // In production, send to error tracking service
  if (typeof window !== 'undefined' && (window as any).analytics) {
    (window as any).analytics.trackError(error, context, additionalData);
  }
};