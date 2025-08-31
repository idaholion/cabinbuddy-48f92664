import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { namesMatch, normalizeName, parseFullName } from '@/lib/name-utils';

interface ClaimedProfile {
  family_group_name: string;
  member_name: string;
  member_type: 'group_lead' | 'host_member';
  claimed_at: string;
}

interface MatchingMember {
  familyGroup: string;
  memberName: string;
  memberType: 'group_lead' | 'host_member';
  matchScore: number; // 0-100, higher is better match
  exactMatch: boolean;
}

export const useEnhancedProfileClaim = (organizationId?: string) => {
  const { user } = useAuth();
  const [claimedProfile, setClaimedProfile] = useState<ClaimedProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [availableMatches, setAvailableMatches] = useState<MatchingMember[]>([]);

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

  const findMatchingMembers = async (searchName: string): Promise<MatchingMember[]> => {
    if (!organizationId || !searchName.trim()) {
      return [];
    }

    try {
      // Fetch all family groups
      const { data: familyGroups, error } = await supabase
        .from('family_groups')
        .select('name, lead_name, host_members')
        .eq('organization_id', organizationId);

      if (error) throw error;

      const matches: MatchingMember[] = [];
      const normalizedSearchName = normalizeName(searchName);
      const searchNameParts = parseFullName(searchName);

      familyGroups?.forEach(group => {
        // Check group lead
        if (group.lead_name) {
          const leadNameParts = parseFullName(group.lead_name);
          let matchScore = 0;
          let exactMatch = false;

          if (namesMatch(searchName, group.lead_name)) {
            exactMatch = normalizeName(searchName) === normalizeName(group.lead_name);
            matchScore = exactMatch ? 100 : 80;

            // Boost score if first names match exactly
            if (searchNameParts.firstName && leadNameParts.firstName &&
                normalizeName(searchNameParts.firstName) === normalizeName(leadNameParts.firstName)) {
              matchScore += 10;
            }

            matches.push({
              familyGroup: group.name,
              memberName: group.lead_name,
              memberType: 'group_lead',
              matchScore,
              exactMatch
            });
          }
        }

        // Check host members
        if (group.host_members && Array.isArray(group.host_members)) {
          group.host_members.forEach((member: any) => {
            if (member.name && namesMatch(searchName, member.name)) {
              const memberNameParts = parseFullName(member.name);
              let matchScore = 0;
              let exactMatch = false;

              exactMatch = normalizeName(searchName) === normalizeName(member.name);
              matchScore = exactMatch ? 100 : 75;

              // Boost score if first names match exactly
              if (searchNameParts.firstName && memberNameParts.firstName &&
                  normalizeName(searchNameParts.firstName) === normalizeName(memberNameParts.firstName)) {
                matchScore += 10;
              }

              matches.push({
                familyGroup: group.name,
                memberName: member.name,
                memberType: 'host_member',
                matchScore,
                exactMatch
              });
            }
          });
        }
      });

      // Sort by match score (highest first)
      return matches.sort((a, b) => b.matchScore - a.matchScore);

    } catch (err: any) {
      console.error('Error finding matching members:', err);
      return [];
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

  const searchForMatches = async (searchName: string) => {
    const matches = await findMatchingMembers(searchName);
    setAvailableMatches(matches);
    return matches;
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
    availableMatches,
    claimProfile,
    searchForMatches,
    refetch: fetchClaimedProfile,
    hasClaimedProfile,
    isGroupLead,
    getClaimedGroupName,
    getClaimedMemberName
  };
};