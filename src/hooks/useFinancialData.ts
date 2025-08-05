import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/hooks/useOrganization';
import { useFamilyGroups } from '@/hooks/useFamilyGroups';

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
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState<FinancialRecord[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  // Get user's family group and role
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user?.id) return;

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
  }, [user?.id]);

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
    if (!userProfile) return 'host';
    
    // Check if user is admin (you might need to adjust this logic)
    if (userProfile.family_role === 'admin' || userProfile.family_role === 'administrator') {
      return 'admin';
    }

    // Check if user is group lead
    const userFamilyGroup = getUserFamilyGroup();
    if (userFamilyGroup) {
      const group = familyGroups.find(g => g.name === userFamilyGroup);
      if (group && group.lead_email?.toLowerCase() === user?.email?.toLowerCase()) {
        return 'group_lead';
      }
    }

    return 'host';
  };

  const fetchFinancialData = async () => {
    if (!user || !organization?.id) return;

    setLoading(true);
    try {
      const accessLevel = getAccessLevel();
      const userFamilyGroup = getUserFamilyGroup();
      
      let query = supabase
        .from('receipts')
        .select('*')
        .eq('organization_id', organization.id)
        .gte('date', `${selectedYear}-01-01`)
        .lte('date', `${selectedYear}-12-31`)
        .order('date', { ascending: false });

      // Apply access level filtering
      if (accessLevel === 'host') {
        // Hosts can only see their own data
        query = query.eq('user_id', user.id);
      } else if (accessLevel === 'group_lead') {
        // Group leads can see all data from their family group
        if (userFamilyGroup) {
          query = query.eq('family_group', userFamilyGroup);
        } else {
          // If no family group found, default to own data
          query = query.eq('user_id', user.id);
        }
      }
      // Admins can see all data (no additional filtering)

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching financial data:', error);
        return;
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
    userFamilyGroup: getUserFamilyGroup(),
    refetch: fetchFinancialData,
  };
};