import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useGuestAccess } from '@/contexts/GuestAccessContext';

export const useGuestOrganization = () => {
  const { isGuestMode, guestOrganization } = useGuestAccess();
  const [organizationData, setOrganizationData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isGuestMode && guestOrganization) {
      fetchGuestOrganizationData();
    } else {
      setOrganizationData(null);
    }
  }, [isGuestMode, guestOrganization]);

  const fetchGuestOrganizationData = async () => {
    if (!guestOrganization?.id) return;

    setLoading(true);
    setError(null);

    try {
      // Fetch basic organization data, family groups, and features
      const [orgResult, familyGroupsResult, featuresResult] = await Promise.all([
        supabase
          .from('organizations')
          .select('*')
          .eq('id', guestOrganization.id)
          .single(),
        
        supabase
          .from('family_groups')
          .select('*')
          .eq('organization_id', guestOrganization.id),
        
        supabase
          .from('features')
          .select('*')
          .eq('organization_id', guestOrganization.id)
          .eq('is_active', true)
      ]);

      if (orgResult.error) throw orgResult.error;
      if (familyGroupsResult.error) throw familyGroupsResult.error;
      if (featuresResult.error) throw featuresResult.error;

      setOrganizationData({
        organization: orgResult.data,
        familyGroups: familyGroupsResult.data || [],
        features: featuresResult.data || [],
      });
    } catch (err) {
      console.error('Error fetching guest organization data:', err);
      setError('Failed to load organization data');
    } finally {
      setLoading(false);
    }
  };

  return {
    isGuestMode,
    guestOrganization,
    organizationData,
    loading,
    error,
    refetch: fetchGuestOrganizationData,
  };
};