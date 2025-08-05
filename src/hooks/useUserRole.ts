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

  useEffect(() => {
    const checkUserRole = () => {
      if (!user?.email || familyGroupsLoading || organizationLoading) {
        setLoading(true);
        return;
      }

      console.log('useUserRole debug:', {
        userEmail: user.email,
        familyGroupsCount: familyGroups.length,
        organizationLoaded: !!organization
      });

      // Check if user is a calendar keeper
      const isCalKeeper = organization?.calendar_keeper_email?.toLowerCase() === user.email.toLowerCase();
      setIsCalendarKeeper(isCalKeeper);

      console.log('Calendar keeper check:', {
        organizationEmail: organization?.calendar_keeper_email,
        userEmail: user.email,
        isCalendarKeeper: isCalKeeper,
        organization: !!organization,
        user: !!user
      });

      // Check if user is a group lead by matching their email to lead_email in any family group
      const leadGroup = familyGroups.find(group => group.lead_email === user.email);
      setIsGroupLead(!!leadGroup);
      
      if (leadGroup) {
        console.log('User is group lead:', leadGroup.name);
        setUserFamilyGroup(leadGroup);
        setUserHostInfo(null);
      } else {
        // Check if user is a host member in any family group
        let foundGroup = null;
        let foundHost = null;
        
        for (const group of familyGroups) {
          console.log('Checking group:', group.name, 'host_members:', group.host_members);
          if (group.host_members) {
            // Log each host member's email for debugging
            group.host_members.forEach((member: any, index: number) => {
              console.log(`Host member ${index}:`, {
                name: member.name,
                email: member.email,
                emailMatch: member.email?.toLowerCase() === user.email.toLowerCase()
              });
            });
            
            const hostMember = group.host_members.find((member: any) => 
              member.email?.toLowerCase() === user.email.toLowerCase()
            );
            if (hostMember) {
              console.log('Found user as host member:', hostMember.name, 'in group:', group.name);
              foundGroup = group;
              foundHost = hostMember;
              break;
            }
          } else {
            console.log('Group has no host_members:', group.name);
          }
        }
        
        setUserFamilyGroup(foundGroup);
        setUserHostInfo(foundHost);
        
        console.log('Final user role state:', {
          isCalendarKeeper: isCalKeeper,
          isGroupLead: !!leadGroup,
          userFamilyGroup: foundGroup?.name,
          userHostInfo: foundHost?.name
        });
      }
      
      setLoading(false);
    };

    checkUserRole();
  }, [user, familyGroups, familyGroupsLoading, organization, organizationLoading]);

  return {
    isGroupLead,
    isHostMember: !isGroupLead && !!userHostInfo && !isCalendarKeeper,
    isCalendarKeeper,
    userFamilyGroup,
    userHostInfo,
    loading,
  };
};