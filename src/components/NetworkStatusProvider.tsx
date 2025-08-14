import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useToast } from '@/hooks/use-toast';

interface NetworkStatusContextType {
  isOnline: boolean;
  isSlowConnection: boolean;
  connectionType: string | null;
}

const NetworkStatusContext = createContext<NetworkStatusContextType>({
  isOnline: true,
  isSlowConnection: false,
  connectionType: null
});

export const useNetworkStatus = () => {
  const context = useContext(NetworkStatusContext);
  return context;
};

interface NetworkStatusProviderProps {
  children: ReactNode;
}

export const NetworkStatusProvider = ({ children }: NetworkStatusProviderProps) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSlowConnection, setIsSlowConnection] = useState(false);
  const [connectionType, setConnectionType] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast({
        title: "Back Online",
        description: "Your connection has been restored.",
      });
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast({
        title: "Connection Lost",
        description: "You're currently offline. Some features may not work.",
        variant: "destructive",
      });
    };

    // Check connection quality
    const checkConnectionQuality = () => {
      // @ts-ignore - connection API may not be available in all browsers
      const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      
      if (connection) {
        setConnectionType(connection.effectiveType || connection.type || 'unknown');
        
        // Consider 2G or slow-2g as slow connections
        const slowTypes = ['slow-2g', '2g'];
        setIsSlowConnection(slowTypes.includes(connection.effectiveType));
        
        // Show warning for very slow connections
        if (connection.effectiveType === 'slow-2g') {
          toast({
            title: "Slow Connection",
            description: "Your connection is slow. Some features may take longer to load.",
          });
        }
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Check initial connection quality
    checkConnectionQuality();
    
    // Listen for connection changes if available
    // @ts-ignore
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (connection) {
      connection.addEventListener('change', checkConnectionQuality);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      
      if (connection) {
        connection.removeEventListener('change', checkConnectionQuality);
      }
    };
  }, [toast]);

  const value = {
    isOnline,
    isSlowConnection,
    connectionType
  };

  return (
    <NetworkStatusContext.Provider value={value}>
      {children}
    </NetworkStatusContext.Provider>
  );
};