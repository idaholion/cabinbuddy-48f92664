import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";

interface SelectionIndicators {
  primary: boolean;
  secondary: boolean;
}

interface TimePeriodUsageData {
  family_group: string;
  time_periods_used: number;
  secondary_periods_used: number;
  rotation_year: number;
}

interface SecondarySelectionData {
  current_family_group: string;
  rotation_year: number;
}

export const useSelectionStatus = (rotationYear: number) => {
  const { organization } = useOrganization();
  const [timePeriodUsage, setTimePeriodUsage] = useState<TimePeriodUsageData[]>([]);
  const [secondarySelectionStatus, setSecondarySelectionStatus] = useState<SecondarySelectionData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!organization?.id) return;

    const fetchSelectionData = async () => {
      setLoading(true);
      try {
        // Fetch time period usage data
        const { data: usageData } = await supabase
          .from('time_period_usage')
          .select('family_group, time_periods_used, secondary_periods_used, rotation_year')
          .eq('organization_id', organization.id)
          .eq('rotation_year', rotationYear);

        if (usageData) {
          setTimePeriodUsage(usageData);
        }

        // Fetch secondary selection status
        const { data: secondaryData } = await supabase
          .from('secondary_selection_status')
          .select('current_family_group, rotation_year')
          .eq('organization_id', organization.id)
          .eq('rotation_year', rotationYear)
          .maybeSingle();

        setSecondarySelectionStatus(secondaryData);
      } catch (error) {
        console.error('Error fetching selection status:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSelectionData();
  }, [organization?.id, rotationYear]);

  const getSelectionIndicators = (familyGroup: string): SelectionIndicators => {
    const usage = timePeriodUsage.find(u => u.family_group === familyGroup);
    
    return {
      primary: usage ? usage.time_periods_used > 0 : false,
      secondary: usage ? usage.secondary_periods_used > 0 : false
    };
  };

  return {
    getSelectionIndicators,
    loading,
    timePeriodUsage,
    secondarySelectionStatus
  };
};