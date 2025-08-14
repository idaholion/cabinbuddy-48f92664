import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { apiCache, cacheKeys } from '@/lib/cache';
import { useRobustAsyncOperation } from './useRobustAsyncOperation';
import { useEnhancedErrorTracking } from './useEnhancedErrorTracking';

interface UserOrganization {
  organization_id: string;
  organization_name: string;
  organization_code: string;
  role: string;
  is_primary: boolean;
  joined_at: string;
}

interface OrganizationData {
  name: string;
  code: string;
  admin_name?: string;
  admin_email?: string;
  admin_phone?: string;
  treasurer_name?: string;
  treasurer_email?: string;
  treasurer_phone?: string;
  calendar_keeper_name?: string;
  calendar_keeper_email?: string;
  calendar_keeper_phone?: string;
  alternate_supervisor_email?: string;
}

export const useRobustMultiOrganization = () => {
  const { user } = useAuth();
  const [organizations, setOrganizations] = useState<UserOrganization[]>([]);
  const [activeOrganization, setActiveOrganization] = useState<UserOrganization | null>(null);
  const [offline, setOffline] = useState(!navigator.onLine);
  const [initialLoad, setInitialLoad] = useState(true);
  const { trackAsyncError } = useEnhancedErrorTracking();
  const lastFetchRef = useRef<string>('');
  
  const { 
    loading, 
    error, 
    execute: executeRobust, 
    reset,
    isNetworkError 
  } = useRobustAsyncOperation({
    timeoutMs: 15000,
    retries: 3,
    enableBackoff: true
  });

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => setOffline(false);
    const handleOffline = () => setOffline(true);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const fetchUserOrganizations = useCallback(async () => {
    if (!user?.id) {
      setOrganizations([]);
      setActiveOrganization(null);
      return;
    }

    // Prevent duplicate requests
    const requestKey = `fetch_${user.id}`;
    if (lastFetchRef.current === requestKey) {
      return;
    }
    lastFetchRef.current = requestKey;

    try {
      await executeRobust(async () => {
        // Check cache first
        const cachedData = apiCache.get<UserOrganization[]>(
          cacheKeys.userOrganizations(user.id)
        );
        
        if (cachedData && !offline) {
          setOrganizations(cachedData);
          const primary = cachedData.find(org => org.is_primary);
          setActiveOrganization(primary || cachedData[0] || null);
          return cachedData;
        }

        // If offline and no cache, show offline message
        if (offline) {
          throw new Error('You are currently offline. Please check your connection.');
        }

        const { data, error: fetchError } = await supabase.rpc('get_user_organizations');
        
        console.log('Fetched organizations data:', data);
        
        if (fetchError) {
          console.error('Organization fetch error:', fetchError);
          throw new Error(`Failed to fetch organizations: ${fetchError.message}`);
        }

        const transformedData = (data || []).map((org: any) => ({
          organization_id: org.organization_id,
          organization_name: org.organization_name,
          organization_code: org.organization_code,
          role: org.role,
          is_primary: org.is_primary,
          joined_at: org.joined_at,
        }));

        setOrganizations(transformedData);
        
        // Set active organization (primary or first)
        const primary = transformedData.find(org => org.is_primary);
        setActiveOrganization(primary || transformedData[0] || null);
        
        // Cache the results with shorter TTL for critical data
        apiCache.set(cacheKeys.userOrganizations(user.id), transformedData, 3 * 60 * 1000);
        
        return transformedData;
      });
    } catch (error: any) {
      trackAsyncError(error, 'fetchUserOrganizations', {
        userId: user.id,
        component: 'useRobustMultiOrganization'
      });
      
      // Try to fall back to cached data on error
      const cachedData = apiCache.get<UserOrganization[]>(
        cacheKeys.userOrganizations(user.id)
      );
      if (cachedData) {
        setOrganizations(cachedData);
        const primary = cachedData.find(org => org.is_primary);
        setActiveOrganization(primary || cachedData[0] || null);
      }
    } finally {
      lastFetchRef.current = '';
      setInitialLoad(false);
    }
  }, [user?.id, executeRobust, trackAsyncError, offline]);

  const switchToOrganization = useCallback(async (organizationId: string) => {
    if (!user?.id) return false;

    try {
      const result = await executeRobust(async () => {
        const { data, error } = await supabase.rpc('set_primary_organization', {
          org_id: organizationId
        });

        if (error) {
          throw new Error(`Failed to switch organization: ${error.message}`);
        }

        // Update local state optimistically
        const updatedOrgs = organizations.map(org => ({
          ...org,
          is_primary: org.organization_id === organizationId
        }));
        
        setOrganizations(updatedOrgs);
        const newActive = updatedOrgs.find(org => org.organization_id === organizationId);
        setActiveOrganization(newActive || null);

        // Invalidate relevant caches
        apiCache.invalidateByPrefix(`user_organizations_${user.id}`);
        apiCache.invalidateByPrefix(`organization_${organizationId}`);

        return data;
      });

      return !!result;
    } catch (error: any) {
      trackAsyncError(error, 'switchToOrganization', {
        userId: user.id,
        action: `switchToOrganization_${organizationId}`,
        component: 'useRobustMultiOrganization'
      });
      return false;
    }
  }, [user?.id, organizations, executeRobust, trackAsyncError]);

  const joinOrganization = useCallback(async (organizationCode: string) => {
    if (!user?.id) return false;

    try {
      const result = await executeRobust(async () => {
        const { data: organizations, error: orgError } = await supabase
          .from('organizations')
          .select('id, name')
          .eq('code', organizationCode.toUpperCase().trim())
          .single();

        if (orgError || !organizations) {
          throw new Error('Organization not found. Please check the code and try again.');
        }

        const { error: joinError } = await supabase
          .from('user_organizations')
          .insert({
            user_id: user.id,
            organization_id: organizations.id,
            role: 'member',
            is_primary: false
          });

        if (joinError) {
          if (joinError.code === '23505') {
            throw new Error('You are already a member of this organization.');
          }
          throw new Error(`Failed to join organization: ${joinError.message}`);
        }

        // Invalidate cache and refetch
        apiCache.invalidateByPrefix(`user_organizations_${user.id}`);
        await fetchUserOrganizations();

        return organizations;
      });

      return !!result;
    } catch (error: any) {
      trackAsyncError(error, 'joinOrganization', {
        userId: user.id,
        action: `joinOrganization_${organizationCode}`,
        component: 'useRobustMultiOrganization'
      });
      return false;
    }
  }, [user?.id, executeRobust, trackAsyncError, fetchUserOrganizations]);

  const createOrganization = useCallback(async (orgData: OrganizationData) => {
    if (!user?.id) return null;

    try {
      const result = await executeRobust(async () => {
        const { data: organization, error: orgError } = await supabase
          .from('organizations')
          .insert({
            name: orgData.name,
            code: orgData.code.toUpperCase(),
            admin_name: orgData.admin_name,
            admin_email: orgData.admin_email,
            admin_phone: orgData.admin_phone,
            treasurer_name: orgData.treasurer_name,
            treasurer_email: orgData.treasurer_email,
            treasurer_phone: orgData.treasurer_phone,
            calendar_keeper_name: orgData.calendar_keeper_name,
            calendar_keeper_email: orgData.calendar_keeper_email,
            calendar_keeper_phone: orgData.calendar_keeper_phone,
            alternate_supervisor_email: orgData.alternate_supervisor_email,
          })
          .select()
          .single();

        if (orgError) {
          if (orgError.code === '23505') {
            throw new Error('An organization with this code already exists.');
          }
          throw new Error(`Failed to create organization: ${orgError.message}`);
        }

        const { error: userOrgError } = await supabase
          .from('user_organizations')
          .insert({
            user_id: user.id,
            organization_id: organization.id,
            role: 'admin',
            is_primary: true
          });

        if (userOrgError) {
          throw new Error(`Failed to associate user with organization: ${userOrgError.message}`);
        }

        // Invalidate cache and refetch
        apiCache.invalidateByPrefix(`user_organizations_${user.id}`);
        await fetchUserOrganizations();

        return organization;
      });

      return result;
    } catch (error: any) {
      trackAsyncError(error, 'createOrganization', {
        userId: user.id,
        action: `createOrganization_${orgData.name}`,
        component: 'useRobustMultiOrganization'
      });
      return null;
    }
  }, [user?.id, executeRobust, trackAsyncError, fetchUserOrganizations]);

  const leaveOrganization = useCallback(async (organizationId: string) => {
    if (!user?.id) return false;

    try {
      const result = await executeRobust(async () => {
        const { error } = await supabase
          .from('user_organizations')
          .delete()
          .eq('user_id', user.id)
          .eq('organization_id', organizationId);

        if (error) {
          throw new Error(`Failed to leave organization: ${error.message}`);
        }

        // Update local state
        const updatedOrgs = organizations.filter(org => org.organization_id !== organizationId);
        setOrganizations(updatedOrgs);
        
        // If we left the active organization, set a new one
        if (activeOrganization?.organization_id === organizationId) {
          setActiveOrganization(updatedOrgs[0] || null);
        }

        // Invalidate caches
        apiCache.invalidateByPrefix(`user_organizations_${user.id}`);
        apiCache.invalidateByPrefix(`organization_${organizationId}`);

        return true;
      });

      return !!result;
    } catch (error: any) {
      trackAsyncError(error, 'leaveOrganization', {
        userId: user.id,
        action: `leaveOrganization_${organizationId}`,
        component: 'useRobustMultiOrganization'
      });
      return false;
    }
  }, [user?.id, organizations, activeOrganization, executeRobust, trackAsyncError]);

  // Fetch organizations when user changes
  useEffect(() => {
    fetchUserOrganizations();
  }, [fetchUserOrganizations]);

  // Auto-retry when coming back online
  useEffect(() => {
    if (!offline && error && isNetworkError) {
      const timer = setTimeout(() => {
        reset();
        fetchUserOrganizations();
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [offline, error, isNetworkError, reset, fetchUserOrganizations]);

  return {
    organizations,
    activeOrganization,
    loading: loading || initialLoad,
    error,
    offline,
    switchToOrganization,
    joinOrganization,
    createOrganization,
    leaveOrganization,
    refetch: fetchUserOrganizations,
    retry: () => {
      reset();
      fetchUserOrganizations();
    }
  };
};