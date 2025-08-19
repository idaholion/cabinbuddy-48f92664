import { useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface LogContext {
  component?: string;
  action?: string;
  userId?: string;
  organizationId?: string;
  route?: string;
  userAgent?: string;
  timestamp?: number;
  additionalData?: Record<string, any>;
}

interface ErrorLog extends LogContext {
  error: Error;
  severity: 'low' | 'medium' | 'high' | 'critical';
  errorType: 'user' | 'system' | 'network' | 'validation';
}

interface UserActionLog extends LogContext {
  actionType: string;
  success: boolean;
  duration?: number;
}

export const useProductionLogger = () => {
  const { user } = useAuth();

  const createBaseContext = useCallback((additionalContext?: Partial<LogContext>): LogContext => {
    return {
      userId: user?.id,
      route: window.location.pathname,
      userAgent: navigator.userAgent,
      timestamp: Date.now(),
      ...additionalContext,
    };
  }, [user]);

  const logError = useCallback((
    error: Error,
    severity: ErrorLog['severity'] = 'medium',
    errorType: ErrorLog['errorType'] = 'system',
    context?: Partial<LogContext>
  ) => {
    const logData: ErrorLog = {
      ...createBaseContext(context),
      error,
      severity,
      errorType,
    };

    // Essential error logging only
    if (severity === 'critical' || severity === 'high') {
      console.error('Error:', error.message);
    }

    // In production, send to monitoring service
    if (process.env.NODE_ENV === 'production') {
      // TODO: Send to external monitoring service (e.g., Sentry, LogRocket)
      // Example: Sentry.captureException(error, { contexts: { custom: logData } });
    }
  }, [createBaseContext]);

  const logUserAction = useCallback((
    actionType: string,
    success: boolean,
    context?: Partial<LogContext>,
    duration?: number
  ) => {
    const logData: UserActionLog = {
      ...createBaseContext(context),
      actionType,
      success,
      duration,
    };

    // Essential action logging only
    if (!success) {
      console.error(`Action failed: ${actionType}`);
    }

    // In production, send to analytics service
    if (process.env.NODE_ENV === 'production') {
      // TODO: Send to analytics service
    }
  }, [createBaseContext]);

  const logPerformance = useCallback((
    metric: string,
    value: number,
    context?: Partial<LogContext>
  ) => {
    const logData = {
      ...createBaseContext(context),
      metric,
      value,
    };

    // Essential performance logging only
    if (value > 5000) { // Only log slow operations
      console.warn(`Slow performance: ${metric} = ${value}ms`);
    }

    // In production, send to monitoring service
    if (process.env.NODE_ENV === 'production') {
      // TODO: Send to performance monitoring service
    }
  }, [createBaseContext]);

  const logInfo = useCallback((
    message: string,
    data?: Record<string, any>,
    context?: Partial<LogContext>
  ) => {
    const logData = {
      ...createBaseContext(context),
      message,
      data,
    };

    // Minimal info logging

    // In production, send to logging service
    if (process.env.NODE_ENV === 'production') {
      // TODO: Send to logging service
    }
  }, [createBaseContext]);

  return {
    logError,
    logUserAction,
    logPerformance,
    logInfo,
  };
};

// Helper function for wrapping async operations with error logging
export const withErrorLogging = <T extends any[]>(
  fn: (...args: T) => Promise<any>,
  context: Partial<LogContext>,
  errorType: ErrorLog['errorType'] = 'system'
) => {
  return async (...args: T) => {
    const startTime = Date.now();
    
    try {
      const result = await fn(...args);
      const duration = Date.now() - startTime;
      
      // Essential success logging only
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      // Essential error logging only
      console.error('Async operation failed:', error.message);
      
      throw error;
    }
  };
};