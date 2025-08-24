import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useFamilyGroups } from '@/hooks/useFamilyGroups';
import { useOrganization } from '@/hooks/useOrganization';

export const useUserRole = () => {
  const { user } = useAuth();
  const { familyGroups, loading: familyGroupsLoading } = useFamilyGroups();
  const { organization, loading: organizationLoading } = useOrganization();
  const [isGroupLead, setIsGroupLead] = useState(false);
  const [isCalendarKeeper, setIsCalendarKeeper] = useState(false);
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
      console.log('🎭 [USER ROLE] Group lead check:', {
        userEmail: user.email,
        familyGroups: familyGroups.map(g => ({ name: g.name, lead_email: g.lead_email })),
        foundLeadGroup: leadGroup?.name,
        isGroupLead: !!leadGroup
      });
      setIsGroupLead(!!leadGroup);
      
      if (leadGroup) {
        setUserFamilyGroup(leadGroup);
        setUserHostInfo(null);
      } else {
        // Check if user is a host member in any family group
        let foundGroup = null;
        let foundHost = null;
        
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
        
        console.log('🎭 [USER ROLE] Host member check:', {
          userEmail: user.email,
          foundGroupName: foundGroup?.name,
          foundHost: foundHost,
          isHost: !!foundHost?.canHost
        });
        
        setUserFamilyGroup(foundGroup);
        setUserHostInfo(foundHost);
      }

      // Check admin/treasurer roles
      const isTreasurer = organization?.treasurer_email?.toLowerCase() === user?.email?.toLowerCase();
      const isAdmin = organization?.admin_email?.toLowerCase() === user?.email?.toLowerCase();
      
      console.log('🎭 [USER ROLE] Final role determination:', {
        userEmail: user.email,
        isAdmin,
        isTreasurer,
        isCalendarKeeper: isCalKeeper,
        isGroupLead: !!leadGroup,
        isGroupMember: !leadGroup && !!userHostInfo,
        isHost: !leadGroup && !!userHostInfo?.canHost,
        organizationAdminEmail: organization?.admin_email,
        organizationTreasurerEmail: organization?.treasurer_email
      });
      
      setLoading(false);
    };

    checkUserRole();
  }, [user, familyGroups, familyGroupsLoading, organization, organizationLoading]);

  return {
    isGroupLead,
    isGroupMember: !isGroupLead && !!userHostInfo,
    isHost: !isGroupLead && !!userHostInfo?.canHost,
    isCalendarKeeper,
    isTreasurer: organization?.treasurer_email?.toLowerCase() === user?.email?.toLowerCase(),
    isAdmin: organization?.admin_email?.toLowerCase() === user?.email?.toLowerCase(),
    userFamilyGroup,
    userHostInfo,
    loading,
  };
};