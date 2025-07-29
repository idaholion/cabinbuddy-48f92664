import { useEffect } from 'react';
import { trackError } from './usePerformanceMonitoring';
import { useToast } from '@/hooks/use-toast';

interface ErrorContext {
  component?: string;
  action?: string;
  userId?: string;
  sessionId?: string;
  route?: string;
  userAgent?: string;
  timestamp?: number;
}

export const useEnhancedErrorTracking = () => {
  const { toast } = useToast();

  useEffect(() => {
    // Global error handler for unhandled errors
    const handleGlobalError = (event: ErrorEvent) => {
      const context: ErrorContext = {
        route: window.location.pathname,
        userAgent: navigator.userAgent,
        timestamp: Date.now(),
      };

      trackError(new Error(event.message), 'Global Error Handler', context);
      
      // Show user-friendly error message
      toast({
        title: "Something went wrong",
        description: "We're working to fix this issue. Please try again.",
        variant: "destructive",
      });
    };

    // Global promise rejection handler
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const context: ErrorContext = {
        route: window.location.pathname,
        userAgent: navigator.userAgent,
        timestamp: Date.now(),
      };

      const error = event.reason instanceof Error 
        ? event.reason 
        : new Error(String(event.reason));

      trackError(error, 'Unhandled Promise Rejection', context);
      
      toast({
        title: "Network Error",
        description: "Please check your connection and try again.",
        variant: "destructive",
      });
    };

    window.addEventListener('error', handleGlobalError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleGlobalError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, [toast]);

  const trackComponentError = (
    error: Error, 
    component: string, 
    additionalContext?: Partial<ErrorContext>
  ) => {
    const context: ErrorContext = {
      component,
      route: window.location.pathname,
      userAgent: navigator.userAgent,
      timestamp: Date.now(),
      ...additionalContext,
    };

    trackError(error, `Component Error: ${component}`, context);
  };

  const trackAsyncError = (
    error: Error, 
    action: string, 
    additionalContext?: Partial<ErrorContext>
  ) => {
    const context: ErrorContext = {
      action,
      route: window.location.pathname,
      userAgent: navigator.userAgent,
      timestamp: Date.now(),
      ...additionalContext,
    };

    trackError(error, `Async Error: ${action}`, context);
  };

  return {
    trackComponentError,
    trackAsyncError,
  };
};

export const withErrorTracking = <T extends any[]>(
  fn: (...args: T) => Promise<any>,
  context: string
) => {
  return async (...args: T) => {
    try {
      return await fn(...args);
    } catch (error) {
      const errorContext: ErrorContext = {
        action: context,
        route: window.location.pathname,
        userAgent: navigator.userAgent,
        timestamp: Date.now(),
      };

      trackError(
        error instanceof Error ? error : new Error(String(error)),
        context,
        errorContext
      );
      throw error;
    }
  };
};