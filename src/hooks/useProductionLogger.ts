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

    // In development, log to console
    if (process.env.NODE_ENV === 'development') {
      console.group(`🚨 ${severity.toUpperCase()} Error (${errorType})`);
      console.error('Error:', error.message);
      console.error('Stack:', error.stack);
      console.log('Context:', logData);
      console.groupEnd();
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

    // In development, log to console
    if (process.env.NODE_ENV === 'development') {
      const emoji = success ? '✅' : '❌';
      console.log(`${emoji} Action: ${actionType}`, { 
        success, 
        duration: duration ? `${duration}ms` : 'N/A',
        context: logData 
      });
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

    // In development, log to console
    if (process.env.NODE_ENV === 'development') {
      console.log(`📊 Performance: ${metric} = ${value}ms`, logData);
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

    // In development, log to console
    if (process.env.NODE_ENV === 'development') {
      console.log(`ℹ️ ${message}`, logData);
    }

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
      
      // Log successful operation in development
      if (process.env.NODE_ENV === 'development') {
        console.log(`✅ Operation completed in ${duration}ms`, { context, args });
      }
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      // Use the global logger if available
      if (process.env.NODE_ENV === 'development') {
        console.group('🚨 Async Operation Failed');
        console.error('Error:', error);
        console.log('Duration:', `${duration}ms`);
        console.log('Context:', context);
        console.log('Arguments:', args);
        console.groupEnd();
      }
      
      throw error;
    }
  };
};