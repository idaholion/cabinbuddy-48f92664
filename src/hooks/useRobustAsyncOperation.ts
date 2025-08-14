import { useState, useCallback, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';

interface UseRobustAsyncOperationOptions {
  successMessage?: string;
  errorMessage?: string;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  timeoutMs?: number;
  retries?: number;
  retryDelayMs?: number;
  enableBackoff?: boolean;
}

interface NetworkError extends Error {
  isNetworkError: boolean;
  status?: number;
}

const isNetworkError = (error: any): error is NetworkError => {
  return error?.name === 'TypeError' || 
         error?.message?.includes('fetch') ||
         error?.message?.includes('network') ||
         error?.status >= 500;
};

export const useRobustAsyncOperation = (options: UseRobustAsyncOperationOptions = {}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const { toast } = useToast();
  const abortControllerRef = useRef<AbortController | null>(null);
  
  const {
    timeoutMs = 30000,
    retries = 3,
    retryDelayMs = 1000,
    enableBackoff = true
  } = options;

  const execute = useCallback(async (operation: () => Promise<any>) => {
    // Cancel any previous operation
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    abortControllerRef.current = new AbortController();
    setLoading(true);
    setError(null);
    setRetryCount(0);

    const executeWithRetry = async (attempt: number = 0): Promise<any> => {
      try {
        // Add timeout wrapper
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Operation timed out')), timeoutMs);
        });

        const operationPromise = operation();
        const result = await Promise.race([operationPromise, timeoutPromise]);
        
        if (options.successMessage) {
          toast({
            title: "Success",
            description: options.successMessage,
          });
        }
        
        options.onSuccess?.();
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        
        // Check if we should retry
        if (attempt < retries && (isNetworkError(error) || error.message.includes('timeout'))) {
          const delay = enableBackoff 
            ? retryDelayMs * Math.pow(2, attempt) 
            : retryDelayMs;
          
          setRetryCount(attempt + 1);
          
          // Show retry notification
          toast({
            title: "Retrying...",
            description: `Attempt ${attempt + 2} of ${retries + 1}`,
          });
          
          await new Promise(resolve => setTimeout(resolve, delay));
          return executeWithRetry(attempt + 1);
        }
        
        // Final error handling
        setError(error);
        
        const errorMessage = isNetworkError(error) 
          ? "Network error. Please check your connection and try again."
          : options.errorMessage || error.message;
        
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
        
        options.onError?.(error);
        throw error;
      }
    };

    try {
      return await executeWithRetry();
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  }, [options, toast, timeoutMs, retries, retryDelayMs, enableBackoff]);

  const reset = useCallback(() => {
    setError(null);
    setLoading(false);
    setRetryCount(0);
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setLoading(false);
  }, []);

  return {
    loading,
    error,
    retryCount,
    execute,
    reset,
    cancel,
    isNetworkError: error ? isNetworkError(error) : false
  };
};