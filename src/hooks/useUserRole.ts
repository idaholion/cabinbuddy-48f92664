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

      // Check if user is a calendar keeper
      const isCalKeeper = organization?.calendar_keeper_email?.toLowerCase() === user.email.toLowerCase();
      setIsCalendarKeeper(isCalKeeper);

      // Check if user is a group lead by matching their email to lead_email in any family group
      const leadGroup = familyGroups.find(group => group.lead_email === user.email);
      setIsGroupLead(!!leadGroup);
      
      if (leadGroup) {
        setUserFamilyGroup(leadGroup);
        setUserHostInfo(null);
      } else {
        // Check if user is a host member in any family group
        for (const group of familyGroups) {
          if (group.host_members) {
            const hostMember = group.host_members.find((member: any) => 
              member.email === user.email
            );
            if (hostMember) {
              setUserFamilyGroup(group);
              setUserHostInfo(hostMember);
              break;
            }
          }
        }
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