import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface GuestAccessContextType {
  isGuestMode: boolean;
  guestOrganization: any | null;
  isValidating: boolean;
  validateGuestAccess: (orgId: string, token: string) => Promise<boolean>;
  exitGuestMode: () => void;
}

const GuestAccessContext = createContext<GuestAccessContextType | undefined>(undefined);

export const useGuestAccess = () => {
  const context = useContext(GuestAccessContext);
  if (context === undefined) {
    throw new Error('useGuestAccess must be used within a GuestAccessProvider');
  }
  return context;
};

interface GuestAccessProviderProps {
  children: ReactNode;
}

export const GuestAccessProvider = ({ children }: GuestAccessProviderProps) => {
  const [isGuestMode, setIsGuestMode] = useState(false);
  const [guestOrganization, setGuestOrganization] = useState<any | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  
  // Safely handle router hooks
  let location: any = null;
  let navigate: any = null;
  
  try {
    location = useLocation();
    navigate = useNavigate();
  } catch (error) {
    // Router hooks not available, which is fine for guest access
    console.warn('Router hooks not available in GuestAccessProvider');
  }

  const validateGuestAccess = async (orgId: string, token: string): Promise<boolean> => {
    setIsValidating(true);
    try {
      // Call the validate_guest_access function
      const { data, error } = await supabase.rpc('validate_guest_access', {
        org_id: orgId,
        token: token
      });

      if (error) {
        console.error('Guest access validation error:', error);
        toast.error('Invalid or expired guest access link');
        return false;
      }

      if (data) {
        // Fetch organization details for guest mode
        const { data: org, error: orgError } = await supabase
          .from('organizations')
          .select('id, name, code, access_type')
          .eq('id', orgId)
          .single();

        if (orgError || !org) {
          toast.error('Organization not found');
          return false;
        }

        setGuestOrganization(org);
        setIsGuestMode(true);
        toast.success(`Welcome to ${org.name}! You're viewing in preview mode.`);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Guest access validation failed:', error);
      toast.error('Failed to validate guest access');
      return false;
    } finally {
      setIsValidating(false);
    }
  };

  const exitGuestMode = () => {
    setIsGuestMode(false);
    setGuestOrganization(null);
    if (navigate) {
      navigate('/');
    } else {
      window.location.href = '/';
    }
    toast.info('Exited preview mode');
  };

  // Check for guest access parameters in URL - only if location is available
  useEffect(() => {
    if (!location) return;
    
    const searchParams = new URLSearchParams(location.search);
    const token = searchParams.get('token');
    const orgId = searchParams.get('org');

    if (token && orgId && !isGuestMode) {
      validateGuestAccess(orgId, token);
    }
  }, [location?.search, isGuestMode]);

  const value = {
    isGuestMode,
    guestOrganization,
    isValidating,
    validateGuestAccess,
    exitGuestMode,
  };

  return (
    <GuestAccessContext.Provider value={value}>
      {children}
    </GuestAccessContext.Provider>
  );
};