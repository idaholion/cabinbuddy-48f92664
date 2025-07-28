import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

interface UseAsyncOperationOptions {
  successMessage?: string;
  errorMessage?: string;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export const useAsyncOperation = (options: UseAsyncOperationOptions = {}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { toast } = useToast();

  const execute = useCallback(async (operation: () => Promise<any>) => {
    setLoading(true);
    setError(null);

    try {
      const result = await operation();
      
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
      setError(error);
      
      toast({
        title: "Error", 
        description: options.errorMessage || error.message,
        variant: "destructive",
      });
      
      options.onError?.(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [options, toast]);

  const reset = useCallback(() => {
    setError(null);
    setLoading(false);
  }, []);

  return {
    loading,
    error,
    execute,
    reset
  };
};