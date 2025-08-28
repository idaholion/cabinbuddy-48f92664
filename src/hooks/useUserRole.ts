import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useFamilyGroups } from '@/hooks/useFamilyGroups';
import { useOrganization } from '@/hooks/useOrganization';
import { useMultiOrganization } from '@/hooks/useMultiOrganization';

// Name matching utility
const isNameMatch = (userName: string, targetName: string): boolean => {
  if (!userName || !targetName) return false;
  
  const normalize = (str: string) => str.toLowerCase().trim();
  const userNormalized = normalize(userName);
  const targetNormalized = normalize(targetName);
  
  // Exact match
  if (userNormalized === targetNormalized) return true;
  
  // Check if names contain each other (for partial matches)
  const userWords = userNormalized.split(/\s+/);
  const targetWords = targetNormalized.split(/\s+/);
  
  // At least 2 words must match for multi-word names
  if (userWords.length > 1 && targetWords.length > 1) {
    const matches = userWords.filter(word => targetWords.includes(word));
    return matches.length >= 2;
  }
  
  // For single words, must be exact match or contain
  return userWords.some(word => targetWords.includes(word)) ||
         targetWords.some(word => userWords.includes(word));
};

export const useUserRole = () => {
  const { user } = useAuth();
  const { familyGroups, loading: familyGroupsLoading } = useFamilyGroups();
  const { organization, loading: organizationLoading } = useOrganization();
  const { activeOrganization } = useMultiOrganization();
  const [isGroupLead, setIsGroupLead] = useState(false);
  const [isCalendarKeeper, setIsCalendarKeeper] = useState(false);
  const [isNameMatchedGroupLead, setIsNameMatchedGroupLead] = useState(false);
  const [isNameMatchedMember, setIsNameMatchedMember] = useState(false);
  const [userFamilyGroup, setUserFamilyGroup] = useState<any>(null);
  const [userHostInfo, setUserHostInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  console.log('🎭 [USER ROLE] Hook called with:', {
    userEmail: user?.email,
    userId: user?.id,
    userMetadata: user?.user_metadata,
    familyGroupsCount: familyGroups.length,
    organizationId: organization?.id,
    organizationName: organization?.name,
    organizationAdminEmail: organization?.admin_email,
    organizationTreasurerEmail: organization?.treasurer_email,
    organizationCalendarKeeperEmail: organization?.calendar_keeper_email
  });

  useEffect(() => {
    const checkUserRole = () => {
      if (!user?.email || familyGroupsLoading || organizationLoading) {
        console.log('🎭 [USER ROLE] Still loading:', { 
          hasUserEmail: !!user?.email,
          familyGroupsLoading, 
          organizationLoading 
        });
        setLoading(true);
        return;
      }

      console.log('🎭 [USER ROLE] Checking roles for user:', user.email);
      
      // Get user display name for matching
      const userDisplayName = user.user_metadata?.display_name || 
                             user.user_metadata?.full_name ||
                             `${user.user_metadata?.first_name || ''} ${user.user_metadata?.last_name || ''}`.trim();

      // Check if user is a calendar keeper
      const isCalKeeper = organization?.calendar_keeper_email?.toLowerCase() === user.email.toLowerCase();
      console.log('🎭 [USER ROLE] Calendar keeper check:', {
        organizationCalendarKeeperEmail: organization?.calendar_keeper_email,
        userEmail: user.email,
        isCalendarKeeper: isCalKeeper
      });
      setIsCalendarKeeper(isCalKeeper);

      // Check if user is a group lead by matching their email to lead_email in any family group (case-insensitive)
      const leadGroup = familyGroups.find(group => 
        group.lead_email?.toLowerCase() === user.email.toLowerCase()
      );
      
      // Check if user matches any group lead by name (for users who haven't claimed profiles yet)
      const nameMatchedLeadGroup = userDisplayName ? familyGroups.find(group => 
        group.lead_name && isNameMatch(userDisplayName, group.lead_name)
      ) : null;
      
      console.log('🎭 [USER ROLE] Group lead check:', {
        userEmail: user.email,
        userDisplayName,
        familyGroups: familyGroups.map(g => ({ 
          name: g.name, 
          lead_email: g.lead_email,
          lead_name: g.lead_name,
          host_members: g.host_members
        })),
        foundLeadGroup: leadGroup?.name,
        nameMatchedLeadGroup: nameMatchedLeadGroup?.name,
        isGroupLead: !!leadGroup,
        isNameMatchedGroupLead: !!nameMatchedLeadGroup
      });
      setIsGroupLead(!!leadGroup);
      setIsNameMatchedGroupLead(!!nameMatchedLeadGroup);
      
      if (leadGroup) {
        setUserFamilyGroup(leadGroup);
        setUserHostInfo(null);
      } else {
        // Check if user is a host member in any family group by email
        let foundGroup = null;
        let foundHost = null;
        let nameMatchedGroup = null;
        let nameMatchedHost = null;
        
        for (const group of familyGroups) {
          if (group.host_members) {
            const hostMember = group.host_members.find((member: any) => 
              member.email?.toLowerCase() === user.email.toLowerCase()
            );
            if (hostMember) {
              foundGroup = group;
              foundHost = hostMember;
              break;
            }
          }
        }
        
        // Check if user matches any host member by name (for users who haven't claimed profiles yet)
        if (userDisplayName && !foundGroup) {
          for (const group of familyGroups) {
            if (group.host_members) {
              const hostMember = group.host_members.find((member: any) => 
                member.name && isNameMatch(userDisplayName, member.name)
              );
              if (hostMember) {
                nameMatchedGroup = group;
                nameMatchedHost = hostMember;
                break;
              }
            }
          }
        }
        
        console.log('🎭 [USER ROLE] Host member check:', {
          userEmail: user.email,
          userDisplayName,
          foundGroupName: foundGroup?.name,
          foundHost: foundHost,
          nameMatchedGroupName: nameMatchedGroup?.name,
          nameMatchedHost: nameMatchedHost,
          isHost: !!foundHost?.canHost,
          isNameMatchedMember: !!nameMatchedHost
        });
        
        setUserFamilyGroup(foundGroup || nameMatchedGroup);
        setUserHostInfo(foundHost || nameMatchedHost);
        setIsNameMatchedMember(!!nameMatchedHost);
      }

      // Check admin/treasurer roles from organization table AND user_organizations table
      const isTreasurer = organization?.treasurer_email?.toLowerCase() === user?.email?.toLowerCase();
      const isOrgAdmin = organization?.admin_email?.toLowerCase() === user?.email?.toLowerCase();
      
      // ADMINISTRATOR FIX: Check if user has admin role in user_organizations table
      const isUserOrganizationAdmin = activeOrganization?.role === 'admin';
      const isAdmin = isOrgAdmin || isUserOrganizationAdmin;
      
      console.log('🎭 [USER ROLE] Final role determination:', {
        userEmail: user.email,
        userDisplayName,
        isOrgAdmin,
        isUserOrganizationAdmin,
        isAdmin,
        isTreasurer,
        isCalendarKeeper: isCalKeeper,
        isGroupLead: !!leadGroup,
        isNameMatchedGroupLead: !!nameMatchedLeadGroup,
        isGroupMember: !leadGroup && !!userHostInfo,
        isNameMatchedMember: isNameMatchedMember,
        isHost: !leadGroup && !!userHostInfo?.canHost,
        organizationAdminEmail: organization?.admin_email,
        organizationTreasurerEmail: organization?.treasurer_email,
        activeOrganizationRole: activeOrganization?.role,
        foundLeadGroup: leadGroup?.name,
        nameMatchedLeadGroup: nameMatchedLeadGroup?.name,
        familyGroupsWithLeadEmails: familyGroups.filter(g => g.lead_email).map(g => ({ name: g.name, lead_email: g.lead_email }))
      });
      
      setLoading(false);
    };

    checkUserRole();
  }, [user, familyGroups, familyGroupsLoading, organization, organizationLoading, activeOrganization?.role, activeOrganization?.organization_id]);

  return {
    isGroupLead,
    isNameMatchedGroupLead,
    isGroupMember: !isGroupLead && !!userHostInfo,
    isNameMatchedMember,
    isHost: !isGroupLead && !!userHostInfo?.canHost,
    isCalendarKeeper,
    isTreasurer: organization?.treasurer_email?.toLowerCase() === user?.email?.toLowerCase(),
    isAdmin: organization?.admin_email?.toLowerCase() === user?.email?.toLowerCase() || activeOrganization?.role === 'admin',
    userFamilyGroup,
    userHostInfo,
    loading,
  };
};
