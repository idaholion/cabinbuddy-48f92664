import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useFamilyGroups } from '@/hooks/useFamilyGroups';

export const useUserRole = () => {
  const { user } = useAuth();
  const { familyGroups, loading: familyGroupsLoading } = useFamilyGroups();
  const [isGroupLead, setIsGroupLead] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUserRole = () => {
      if (!user?.email || familyGroupsLoading) {
        setLoading(true);
        return;
      }

      // Check if user is a group lead by matching their email to lead_email in any family group
      const isLead = familyGroups.some(group => group.lead_email === user.email);
      setIsGroupLead(isLead);
      setLoading(false);
    };

    checkUserRole();
  }, [user, familyGroups, familyGroupsLoading]);

  return {
    isGroupLead,
    isHostMember: !isGroupLead, // If not a group lead, they're a host member
    loading,
  };
};