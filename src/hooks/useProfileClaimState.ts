import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useRobustMultiOrganization } from '@/hooks/useRobustMultiOrganization';

interface ClaimedProfile {
  family_group_name: string;
  member_name: string;
  member_type: 'group_lead' | 'host_member';
  claimed_at: string;
}

interface UnclaimedMember {
  familyGroupName: string;
  memberName: string;
  memberType: 'group_lead' | 'host_member';
  email?: string;
}

interface ProfileClaimState {
  // Core state
  claimedProfile: ClaimedProfile | null;
  unclaimedMembers: UnclaimedMember[];
  loading: boolean;
  
  // UI state
  showModal: boolean;
  showBanner: boolean;
  
  // Actions
  openModal: () => void;
  closeModal: () => void;
  dismissModal: () => void;
  claimProfile: (familyGroupName: string, memberName: string, memberType: 'group_lead' | 'host_member') => Promise<boolean>;
  refreshState: () => Promise<void>;
}

const DISMISSED_KEY = 'profile_claim_dismissed';

const getDismissedKey = (orgId: string, userId: string) => 
  `${DISMISSED_KEY}_${orgId}_${userId}`;

export const useProfileClaimState = (): ProfileClaimState => {
  const { user } = useAuth();
  const { activeOrganization } = useRobustMultiOrganization();
  
  const [claimedProfile, setClaimedProfile] = useState<ClaimedProfile | null>(null);
  const [unclaimedMembers, setUnclaimedMembers] = useState<UnclaimedMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);

  const orgId = activeOrganization?.organization_id;
  const userId = user?.id;

  // Check if modal was previously dismissed
  const checkDismissedState = useCallback(() => {
    if (!orgId || !userId) return false;
    const key = getDismissedKey(orgId, userId);
    return localStorage.getItem(key) === 'true';
  }, [orgId, userId]);

  // Save dismissed state
  const saveDismissedState = useCallback((dismissed: boolean) => {
    if (!orgId || !userId) return;
    const key = getDismissedKey(orgId, userId);
    if (dismissed) {
      localStorage.setItem(key, 'true');
    } else {
      localStorage.removeItem(key);
    }
    setIsDismissed(dismissed);
  }, [orgId, userId]);

  // Fetch claimed profile
  const fetchClaimedProfile = useCallback(async (): Promise<ClaimedProfile | null> => {
    if (!orgId) return null;
    
    try {
      const { data, error } = await supabase.rpc('get_user_claimed_profile', {
        p_organization_id: orgId
      });
      
      if (error) throw error;
      return data as unknown as ClaimedProfile | null;
    } catch (err) {
      console.error('Error fetching claimed profile:', err);
      return null;
    }
  }, [orgId]);

  // Fetch all unclaimed members in the organization
  const fetchUnclaimedMembers = useCallback(async (): Promise<UnclaimedMember[]> => {
    if (!orgId) return [];
    
    try {
      // Get all family groups
      const { data: familyGroups, error: fgError } = await supabase
        .from('family_groups')
        .select('name, lead_name, lead_email, host_members')
        .eq('organization_id', orgId);
      
      if (fgError) throw fgError;
      
      // Get all claimed profiles
      const { data: claimedLinks, error: clError } = await supabase
        .from('member_profile_links')
        .select('family_group_name, member_name')
        .eq('organization_id', orgId)
        .not('claimed_by_user_id', 'is', null);
      
      if (clError) throw clError;
      
      const claimedSet = new Set(
        claimedLinks?.map(l => `${l.family_group_name}::${l.member_name.toLowerCase().trim()}`) || []
      );
      
      const unclaimed: UnclaimedMember[] = [];
      
      for (const group of familyGroups || []) {
        // Check group lead
        if (group.lead_name) {
          const key = `${group.name}::${group.lead_name.toLowerCase().trim()}`;
          if (!claimedSet.has(key)) {
            unclaimed.push({
              familyGroupName: group.name,
              memberName: group.lead_name,
              memberType: 'group_lead',
              email: group.lead_email || undefined
            });
          }
        }
        
        // Check host members
        if (group.host_members && Array.isArray(group.host_members)) {
          for (const member of group.host_members) {
            const memberData = member as { name?: string; email?: string };
            if (memberData.name) {
              // Skip if this is also the group lead
              if (group.lead_name?.toLowerCase().trim() === memberData.name.toLowerCase().trim()) {
                continue;
              }
              
              const key = `${group.name}::${memberData.name.toLowerCase().trim()}`;
              if (!claimedSet.has(key)) {
                unclaimed.push({
                  familyGroupName: group.name,
                  memberName: memberData.name,
                  memberType: 'host_member',
                  email: memberData.email || undefined
                });
              }
            }
          }
        }
      }
      
      // Sort: group leads first, then alphabetically
      return unclaimed.sort((a, b) => {
        if (a.memberType !== b.memberType) {
          return a.memberType === 'group_lead' ? -1 : 1;
        }
        return a.memberName.localeCompare(b.memberName);
      });
    } catch (err) {
      console.error('Error fetching unclaimed members:', err);
      return [];
    }
  }, [orgId]);

  // Refresh all state
  const refreshState = useCallback(async () => {
    setLoading(true);
    try {
      const [claimed, unclaimed] = await Promise.all([
        fetchClaimedProfile(),
        fetchUnclaimedMembers()
      ]);
      
      setClaimedProfile(claimed);
      setUnclaimedMembers(unclaimed);
      
      // If user just claimed, clear dismissed state
      if (claimed) {
        saveDismissedState(false);
      }
    } finally {
      setLoading(false);
    }
  }, [fetchClaimedProfile, fetchUnclaimedMembers, saveDismissedState]);

  // Claim a profile
  const claimProfile = useCallback(async (
    familyGroupName: string,
    memberName: string,
    memberType: 'group_lead' | 'host_member'
  ): Promise<boolean> => {
    if (!orgId) return false;
    
    try {
      const { data, error } = await supabase.rpc('claim_family_member_profile', {
        p_organization_id: orgId,
        p_family_group_name: familyGroupName,
        p_member_name: memberName,
        p_member_type: memberType
      });
      
      if (error) throw error;
      
      const result = data as { success: boolean; error?: string };
      
      if (result.success) {
        // Clear dismissed state and refresh
        saveDismissedState(false);
        await refreshState();
        setShowModal(false);
        return true;
      }
      
      console.error('Claim failed:', result.error);
      return false;
    } catch (err) {
      console.error('Error claiming profile:', err);
      return false;
    }
  }, [orgId, refreshState, saveDismissedState]);

  // Modal actions
  const openModal = useCallback(() => setShowModal(true), []);
  const closeModal = useCallback(() => setShowModal(false), []);
  
  const dismissModal = useCallback(() => {
    setShowModal(false);
    saveDismissedState(true);
  }, [saveDismissedState]);

  // Initialize state on mount/org change
  useEffect(() => {
    if (!orgId || !userId) {
      setLoading(false);
      return;
    }
    
    const init = async () => {
      setLoading(true);
      setHasInitialized(false);
      
      const dismissed = checkDismissedState();
      setIsDismissed(dismissed);
      
      await refreshState();
      setHasInitialized(true);
    };
    
    init();
  }, [orgId, userId, checkDismissedState, refreshState]);

  // Auto-show modal on first visit (no claimed profile, not dismissed, has unclaimed members)
  useEffect(() => {
    if (!hasInitialized || loading) return;
    
    const shouldShowModal = 
      !claimedProfile && 
      !isDismissed && 
      unclaimedMembers.length > 0;
    
    if (shouldShowModal) {
      setShowModal(true);
    }
  }, [hasInitialized, loading, claimedProfile, isDismissed, unclaimedMembers.length]);

  // Compute banner visibility
  const showBanner = 
    hasInitialized &&
    !loading &&
    !claimedProfile && 
    isDismissed && 
    unclaimedMembers.length > 0 &&
    !showModal;

  return {
    claimedProfile,
    unclaimedMembers,
    loading,
    showModal,
    showBanner,
    openModal,
    closeModal,
    dismissModal,
    claimProfile,
    refreshState
  };
};
