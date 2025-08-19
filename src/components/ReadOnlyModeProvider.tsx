import React, { createContext, useContext, ReactNode } from 'react';
import { useGuestAccess } from '@/contexts/GuestAccessContext';

interface ReadOnlyModeContextType {
  isReadOnly: boolean;
}

const ReadOnlyModeContext = createContext<ReadOnlyModeContextType>({ isReadOnly: false });

export const useReadOnlyMode = () => useContext(ReadOnlyModeContext);

interface ReadOnlyModeProviderProps {
  children: ReactNode;
}

export const ReadOnlyModeProvider = ({ children }: ReadOnlyModeProviderProps) => {
  const { isGuestMode } = useGuestAccess();

  return (
    <ReadOnlyModeContext.Provider value={{ isReadOnly: isGuestMode }}>
      {children}
    </ReadOnlyModeContext.Provider>
  );
};

interface ReadOnlyWrapperProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export const ReadOnlyWrapper = ({ children, fallback }: ReadOnlyWrapperProps) => {
  const { isReadOnly } = useReadOnlyMode();
  
  if (isReadOnly) {
    return fallback || null;
  }
  
  return <>{children}</>;
};