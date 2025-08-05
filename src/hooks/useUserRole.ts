import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useFamilyGroups } from '@/hooks/useFamilyGroups';

export const useUserRole = () => {
  const { user } = useAuth();
  const { familyGroups, loading: familyGroupsLoading } = useFamilyGroups();
  const [isGroupLead, setIsGroupLead] = useState(false);
  const [userFamilyGroup, setUserFamilyGroup] = useState<any>(null);
  const [userHostInfo, setUserHostInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUserRole = () => {
      if (!user?.email || familyGroupsLoading) {
        setLoading(true);
        return;
      }

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
  }, [user, familyGroups, familyGroupsLoading]);

  return {
    isGroupLead,
    isHostMember: !isGroupLead && !!userHostInfo,
    userFamilyGroup,
    userHostInfo,
    loading,
  };
};