import { useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useProductionLogger } from './useProductionLogger';

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
  const { logError } = useProductionLogger();

  useEffect(() => {
    // Global error handler for unhandled errors
    const handleGlobalError = (event: ErrorEvent) => {
      logError(
        new Error(event.message), 
        'high', 
        'system',
        { component: 'Global Error Handler' }
      );
      
      // Show user-friendly error message
      toast({
        title: "Something went wrong",
        description: "We're working to fix this issue. Please try again.",
        variant: "destructive",
      });
    };

    // Global promise rejection handler
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const error = event.reason instanceof Error 
        ? event.reason 
        : new Error(String(event.reason));

      logError(
        error, 
        'high', 
        'network',
        { component: 'Unhandled Promise Rejection' }
      );
      
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
  }, [toast, logError]);

  const trackComponentError = (
    error: Error, 
    component: string, 
    additionalContext?: Partial<ErrorContext>
  ) => {
    logError(
      error, 
      'medium', 
      'user',
      { component, ...additionalContext }
    );
  };

  const trackAsyncError = (
    error: Error, 
    action: string, 
    additionalContext?: Partial<ErrorContext>
  ) => {
    logError(
      error, 
      'medium', 
      'system',
      { action, ...additionalContext }
    );
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
      // Log error using development console in dev mode
      if (process.env.NODE_ENV === 'development') {
        console.group(`🚨 Async Error in ${context}`);
        console.error('Error:', error);
        console.log('Route:', window.location.pathname);
        console.log('UserAgent:', navigator.userAgent);
        console.log('Timestamp:', Date.now());
        console.groupEnd();
      }
      
      throw error;
    }
  };
};