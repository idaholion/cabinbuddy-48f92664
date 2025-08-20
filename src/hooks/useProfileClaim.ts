import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface ClaimedProfile {
  family_group_name: string;
  member_name: string;
  member_type: 'group_lead' | 'host_member';
  claimed_at: string;
}

export const useProfileClaim = (organizationId?: string) => {
  const { user } = useAuth();
  const [claimedProfile, setClaimedProfile] = useState<ClaimedProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchClaimedProfile = async () => {
    if (!user || !organizationId) {
      setClaimedProfile(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase.rpc('get_user_claimed_profile', {
        p_organization_id: organizationId
      });

      if (fetchError) throw fetchError;

      setClaimedProfile(data ? data as unknown as ClaimedProfile : null);
    } catch (err: any) {
      console.error('Error fetching claimed profile:', err);
      setError(err.message);
      setClaimedProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const claimProfile = async (
    familyGroupName: string, 
    memberName: string, 
    memberType: 'group_lead' | 'host_member' = 'host_member'
  ) => {
    if (!organizationId) {
      throw new Error('Organization ID is required');
    }

    try {
      const { data, error } = await supabase.rpc('claim_family_member_profile', {
        p_organization_id: organizationId,
        p_family_group_name: familyGroupName,
        p_member_name: memberName,
        p_member_type: memberType
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string; message?: string };

      if (!result.success) {
        throw new Error(result.error || 'Failed to claim profile');
      }

      // Refresh the claimed profile
      await fetchClaimedProfile();

      return result;
    } catch (err: any) {
      console.error('Error claiming profile:', err);
      throw err;
    }
  };

  const hasClaimedProfile = () => {
    return claimedProfile !== null;
  };

  const isGroupLead = () => {
    return claimedProfile?.member_type === 'group_lead';
  };

  const getClaimedGroupName = () => {
    return claimedProfile?.family_group_name;
  };

  const getClaimedMemberName = () => {
    return claimedProfile?.member_name;
  };

  useEffect(() => {
    fetchClaimedProfile();
  }, [user, organizationId]);

  return {
    claimedProfile,
    loading,
    error,
    claimProfile,
    refetch: fetchClaimedProfile,
    hasClaimedProfile,
    isGroupLead,
    getClaimedGroupName,
    getClaimedMemberName
  };
};