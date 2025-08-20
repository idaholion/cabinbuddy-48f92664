import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useRobustMultiOrganization } from '@/hooks/useRobustMultiOrganization';
import { useAuth } from '@/contexts/AuthContext';

interface ClaimedProfile {
  family_group_name: string;
  member_name: string;
  member_type: 'group_lead' | 'host_member';
  claimed_at: string;
}

export const useProfileClaiming = () => {
  const { user } = useAuth();
  const { activeOrganization } = useRobustMultiOrganization();
  const [claimedProfile, setClaimedProfile] = useState<ClaimedProfile | null>(null);
  const [loading, setLoading] = useState(false);

  const checkClaimedProfile = async () => {
    if (!user?.id || !activeOrganization?.organization_id) {
      setClaimedProfile(null);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_user_claimed_profile', {
        p_organization_id: activeOrganization.organization_id
      });

      if (error) {
        console.error('Error checking claimed profile:', error);
        setClaimedProfile(null);
        return;
      }

      setClaimedProfile(data as unknown as ClaimedProfile | null);
    } catch (error) {
      console.error('Error checking claimed profile:', error);
      setClaimedProfile(null);
    } finally {
      setLoading(false);
    }
  };

  // Check for claimed profile when user or organization changes
  useEffect(() => {
    checkClaimedProfile();
  }, [user?.id, activeOrganization?.organization_id]);

  const refreshClaimedProfile = () => {
    checkClaimedProfile();
  };

  const hasClaimedProfile = Boolean(claimedProfile);

  const isGroupLead = claimedProfile?.member_type === 'group_lead';

  return {
    claimedProfile,
    loading,
    hasClaimedProfile,
    isGroupLead,
    refreshClaimedProfile
  };
};