import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/hooks/useOrganization';
import { useFamilyGroups } from '@/hooks/useFamilyGroups';
import { useUserRole } from '@/hooks/useUserRole';
import { secureSelect, assertOrganizationOwnership, createOrganizationContext } from '@/lib/secure-queries';

interface FinancialRecord {
  id: string;
  user_id: string | null;
  family_group: string | null;
  description: string;
  amount: number;
  date: string;
  image_url: string | null;
  created_at: string;
}

interface UserProfile {
  user_id: string;
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  family_role: string | null;
}

export const useFinancialData = () => {
  const { user } = useAuth();
  const { organization } = useOrganization();
  const { familyGroups } = useFamilyGroups();
  const { isAdmin, isTreasurer, isGroupLead, userFamilyGroup: roleUserFamilyGroup } = useUserRole();
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState<FinancialRecord[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  // Get user's family group and role
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user?.id || !organization?.id) return;

      const orgContext = createOrganizationContext(organization.id);
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, display_name, first_name, last_name, family_role')
        .eq('user_id', user.id)
        .single();

      if (!error && data) {
        setUserProfile(data);
      }
    };

    fetchUserProfile();
  }, [user?.id, organization?.id]);

  // Determine user's family group
  const getUserFamilyGroup = () => {
    if (!userProfile || !familyGroups.length) return null;
    
    // Check if user is in any family group's host_members
    for (const group of familyGroups) {
      if (group.host_members && Array.isArray(group.host_members)) {
        const isInGroup = group.host_members.some((member: any) => 
          member.user_id === user?.id || 
          member.email?.toLowerCase() === user?.email?.toLowerCase()
        );
        if (isInGroup) {
          return group.name;
        }
      }
    }
    return null;
  };

  // Determine user's access level
  const getAccessLevel = () => {
    // Use organization-level roles first (more reliable)
    if (isAdmin) {
      return 'admin';
    }
    
    if (isTreasurer) {
      return 'treasurer';
    }
    
    if (isGroupLead) {
      return 'group_lead';
    }

    return 'host';
  };

  const fetchFinancialData = async () => {
    if (!user || !organization?.id) return;

    setLoading(true);
    try {
      const orgContext = createOrganizationContext(organization.id);
      const accessLevel = getAccessLevel();
      const userFamilyGroup = getUserFamilyGroup();
      
      let query = secureSelect('receipts', orgContext)
        .select('*')
        .gte('date', `${selectedYear}-01-01`)
        .lte('date', `${selectedYear}-12-31`)
        .order('date', { ascending: false });

      // Apply access level filtering
      if (accessLevel === 'host') {
        // Hosts can only see their own data
        query = query.eq('user_id', user.id);
      } else if (accessLevel === 'group_lead') {
        // Group leads can see all data from their family group
        const userFamilyGroupName = roleUserFamilyGroup?.name || getUserFamilyGroup();
        if (userFamilyGroupName) {
          query = query.eq('family_group', userFamilyGroupName);
        } else {
          // If no family group found, default to own data
          query = query.eq('user_id', user.id);
        }
      }
      // Admins and treasurers can see all data (no additional filtering)

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching financial data:', error);
        return;
      }

      // Validate data ownership
      if (data) {
        assertOrganizationOwnership(data, orgContext);
      }

      setRecords(data || []);
    } catch (error) {
      console.error('Error in fetchFinancialData:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (organization?.id && userProfile) {
      fetchFinancialData();
    }
  }, [organization?.id, userProfile, selectedYear]);

  // Get available years from data
  const getAvailableYears = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let year = currentYear; year >= currentYear - 5; year--) {
      years.push(year);
    }
    return years;
  };

  // Calculate totals
  const getTotalAmount = () => {
    return records.reduce((sum, record) => sum + Number(record.amount), 0);
  };

  return {
    records,
    loading,
    selectedYear,
    setSelectedYear,
    availableYears: getAvailableYears(),
    totalAmount: getTotalAmount(),
    accessLevel: getAccessLevel(),
    userFamilyGroup: roleUserFamilyGroup?.name || getUserFamilyGroup(),
    refetch: fetchFinancialData,
  };
};