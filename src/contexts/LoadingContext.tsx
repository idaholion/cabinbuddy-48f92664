import React, { createContext, useContext, useState, ReactNode } from 'react';

interface LoadingContextType {
  globalLoading: boolean;
  setGlobalLoading: (loading: boolean) => void;
  componentLoading: Record<string, boolean>;
  setComponentLoading: (component: string, loading: boolean) => void;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export const useLoading = () => {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
};

interface LoadingProviderProps {
  children: ReactNode;
}

export const LoadingProvider = ({ children }: LoadingProviderProps) => {
  const [globalLoading, setGlobalLoading] = useState(false);
  const [componentLoading, setComponentLoadingState] = useState<Record<string, boolean>>({});

  const setComponentLoading = (component: string, loading: boolean) => {
    setComponentLoadingState(prev => ({
      ...prev,
      [component]: loading
    }));
  };

  const value = {
    globalLoading,
    setGlobalLoading,
    componentLoading,
    setComponentLoading,
  };

  return (
    <LoadingContext.Provider value={value}>
      {children}
    </LoadingContext.Provider>
  );
};

// Hook for managing async operations with loading states
export const useAsyncOperation = () => {
  const { setComponentLoading } = useLoading();

  const executeWithLoading = async <T,>(
    component: string,
    operation: () => Promise<T>
  ): Promise<T> => {
    setComponentLoading(component, true);
    try {
      const result = await operation();
      return result;
    } finally {
      setComponentLoading(component, false);
    }
  };

  return { executeWithLoading };
};

// Higher-order component for automatic loading states
interface WithLoadingProps {
  component: string;
  fallback?: ReactNode;
  children: ReactNode;
}

export const WithLoading = ({ component, fallback, children }: WithLoadingProps) => {
  const { componentLoading } = useLoading();
  
  if (componentLoading[component]) {
    return <>{fallback}</> || <div>Loading...</div>;
  }
  
  return <>{children}</>;
};