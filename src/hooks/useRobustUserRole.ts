import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRobustMultiOrganization } from './useRobustMultiOrganization';
import { apiCache, cacheKeys } from '@/lib/cache';
import { supabase } from '@/integrations/supabase/client';
import { useRobustAsyncOperation } from './useRobustAsyncOperation';

interface FamilyGroup {
  id: string;
  name: string;
  lead_email?: string;
  host_members?: any;
}

export const useRobustUserRole = () => {
  const { user } = useAuth();
  const { activeOrganization } = useRobustMultiOrganization();
  const [familyGroups, setFamilyGroups] = useState<FamilyGroup[]>([]);
  const [initialized, setInitialized] = useState(false);
  
  const { execute: executeRobust } = useRobustAsyncOperation({
    timeoutMs: 10000,
    retries: 2
  });

  // Fetch family groups with caching
  useEffect(() => {
    if (!activeOrganization?.organization_id || !user?.id) {
      setFamilyGroups([]);
      setInitialized(true);
      return;
    }

    const fetchFamilyGroups = async () => {
      try {
        await executeRobust(async () => {
          // Check cache first
          const cacheKey = cacheKeys.familyGroups(activeOrganization.organization_id);
          const cached = apiCache.get<FamilyGroup[]>(cacheKey);
          
          if (cached) {
            setFamilyGroups(cached);
            setInitialized(true);
            return;
          }

          const { data, error } = await supabase
            .from('family_groups')
            .select('id, name, lead_email, host_members')
            .eq('organization_id', activeOrganization.organization_id);

          if (error) throw error;

          const groups = (data || []).map(group => ({
            ...group,
            host_members: Array.isArray(group.host_members) ? group.host_members : []
          }));
          setFamilyGroups(groups);
          
          // Cache for 2 minutes
          apiCache.set(cacheKey, groups, 2 * 60 * 1000);
          setInitialized(true);
        });
      } catch (error) {
        console.error('Failed to fetch family groups:', error);
        setInitialized(true);
      }
    };

    fetchFamilyGroups();
  }, [activeOrganization?.organization_id, user?.id, executeRobust]);

  // Compute roles with improved memoization
  const userRoles = useMemo(() => {
    if (!user?.email || !initialized) {
      return {
        isGroupLead: false,
        isHostMember: false,
        isCalendarKeeper: false,
        isTreasurer: false,
        isAdmin: false,
        userFamilyGroup: null,
        userHostInfo: null,
        loading: !initialized
      };
    }

    const userEmail = user.email.toLowerCase();
    
    // Check organization roles - using simplified approach since org fields may vary
    const isCalendarKeeper = false; // TODO: Implement when organization schema is clarified
    const isTreasurer = false; // TODO: Implement when organization schema is clarified
    const isAdmin = false; // TODO: Implement when organization schema is clarified

    // Check family group roles
    const leadGroup = familyGroups.find(group => 
      group.lead_email?.toLowerCase() === userEmail
    );
    
    if (leadGroup) {
      return {
        isGroupLead: true,
        isHostMember: false,
        isCalendarKeeper,
        isTreasurer,
        isAdmin,
        userFamilyGroup: leadGroup,
        userHostInfo: null,
        loading: false
      };
    }

    // Check host member status
    let userFamilyGroup = null;
    let userHostInfo = null;
    
    for (const group of familyGroups) {
      if (Array.isArray(group.host_members)) {
        const hostMember = group.host_members.find((member: any) => 
          member?.email?.toLowerCase() === userEmail
        );
        if (hostMember) {
          userFamilyGroup = group;
          userHostInfo = hostMember;
          break;
        }
      }
    }

    return {
      isGroupLead: false,
      isHostMember: !!userHostInfo,
      isCalendarKeeper,
      isTreasurer,
      isAdmin,
      userFamilyGroup,
      userHostInfo,
      loading: false
    };
  }, [user?.email, familyGroups, activeOrganization, initialized]);

  return userRoles;
};