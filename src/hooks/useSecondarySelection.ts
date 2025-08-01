import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { useRotationOrder } from '@/hooks/useRotationOrder';
import { useTimePeriods } from '@/hooks/useTimePeriods';

interface SecondarySelectionData {
  id: string;
  organization_id: string;
  rotation_year: number;
  current_family_group: string | null;
  current_group_index: number;
  started_at: string | null;
  created_at: string;
  updated_at: string;
}

export const useSecondarySelection = (rotationYear: number) => {
  const { organization } = useOrganization();
  const { rotationData, getRotationForYear } = useRotationOrder();
  const { timePeriodUsage, fetchTimePeriodUsage } = useTimePeriods();
  
  const [secondaryStatus, setSecondaryStatus] = useState<SecondarySelectionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSecondaryRoundActive, setIsSecondaryRoundActive] = useState(false);

  useEffect(() => {
    if (!organization?.id) return;
    fetchSecondarySelectionStatus();
    checkIfSecondaryRoundShouldStart();
  }, [organization?.id, rotationYear, timePeriodUsage]);

  const fetchSecondarySelectionStatus = async () => {
    if (!organization?.id) return;

    try {
      const { data, error } = await supabase
        .from('secondary_selection_status')
        .select('*')
        .eq('organization_id', organization.id)
        .eq('rotation_year', rotationYear)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching secondary selection status:', error);
        return;
      }

      setSecondaryStatus(data);
      setIsSecondaryRoundActive(!!data?.current_family_group);
    } catch (error) {
      console.error('Error in fetchSecondarySelectionStatus:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkIfSecondaryRoundShouldStart = async () => {
    if (!organization?.id || !rotationData || !timePeriodUsage.length) return;

    // Check if all family groups have completed their primary selections
    const rotationOrder = getRotationForYear(rotationYear);
    const allCompletedPrimary = rotationOrder.every(familyGroup => {
      const usage = timePeriodUsage.find(u => u.family_group === familyGroup);
      return usage && usage.time_periods_used >= (rotationData.max_time_slots || 2);
    });

    // Check if secondary selection is enabled
    const secondaryEnabled = rotationData.enable_secondary_selection;

    if (allCompletedPrimary && secondaryEnabled && !secondaryStatus) {
      await startSecondarySelection();
    }
  };

  const startSecondarySelection = async () => {
    if (!organization?.id || !rotationData) return;

    try {
      // Get reverse order for secondary selection (last person goes first)
      const rotationOrder = getRotationForYear(rotationYear);
      const reverseOrder = [...rotationOrder].reverse();
      
      // Find first family group that can make secondary selections
      const firstEligibleFamily = reverseOrder.find(familyGroup => {
        const usage = timePeriodUsage.find(u => u.family_group === familyGroup);
        const remainingSecondary = (rotationData.secondary_max_periods || 1) - (usage?.secondary_periods_used || 0);
        return remainingSecondary > 0;
      });

      if (!firstEligibleFamily) return;

      const { error } = await supabase
        .from('secondary_selection_status')
        .insert({
          organization_id: organization.id,
          rotation_year: rotationYear,
          current_family_group: firstEligibleFamily,
          current_group_index: reverseOrder.indexOf(firstEligibleFamily),
          started_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error starting secondary selection:', error);
        return;
      }

      // Update all family groups to secondary selection round
      await supabase
        .from('time_period_usage')
        .update({ selection_round: 'secondary' })
        .eq('organization_id', organization.id)
        .eq('rotation_year', rotationYear);

      fetchSecondarySelectionStatus();
    } catch (error) {
      console.error('Error starting secondary selection:', error);
    }
  };

  const advanceSecondarySelection = async () => {
    if (!organization?.id || !secondaryStatus || !rotationData) return;

    const rotationOrder = getRotationForYear(rotationYear);
    const reverseOrder = [...rotationOrder].reverse();
    
    let nextIndex = (secondaryStatus.current_group_index + 1) % reverseOrder.length;
    let nextFamily = reverseOrder[nextIndex];
    
    // Find next family with remaining secondary periods
    let attempts = 0;
    while (attempts < reverseOrder.length) {
      const usage = timePeriodUsage.find(u => u.family_group === nextFamily);
      const remainingSecondary = (rotationData.secondary_max_periods || 1) - (usage?.secondary_periods_used || 0);
      
      if (remainingSecondary > 0) {
        break;
      }
      
      nextIndex = (nextIndex + 1) % reverseOrder.length;
      nextFamily = reverseOrder[nextIndex];
      attempts++;
    }

    // If no one has remaining secondary periods, end secondary selection
    if (attempts >= reverseOrder.length) {
      await endSecondarySelection();
      return;
    }

    const { error } = await supabase
      .from('secondary_selection_status')
      .update({
        current_family_group: nextFamily,
        current_group_index: nextIndex,
        updated_at: new Date().toISOString()
      })
      .eq('id', secondaryStatus.id);

    if (error) {
      console.error('Error advancing secondary selection:', error);
      return;
    }

    fetchSecondarySelectionStatus();
  };

  const endSecondarySelection = async () => {
    if (!organization?.id || !secondaryStatus) return;

    const { error } = await supabase
      .from('secondary_selection_status')
      .update({
        current_family_group: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', secondaryStatus.id);

    if (error) {
      console.error('Error ending secondary selection:', error);
      return;
    }

    setIsSecondaryRoundActive(false);
    fetchSecondarySelectionStatus();
  };

  const isCurrentFamilyTurn = (familyGroup: string): boolean => {
    return secondaryStatus?.current_family_group === familyGroup;
  };

  const getRemainingSecondaryPeriods = (familyGroup: string): number => {
    if (!rotationData) return 0;
    
    const usage = timePeriodUsage.find(u => u.family_group === familyGroup);
    return (rotationData.secondary_max_periods || 1) - (usage?.secondary_periods_used || 0);
  };

  const getSecondarySelectionOrder = (): string[] => {
    const rotationOrder = getRotationForYear(rotationYear);
    return [...rotationOrder].reverse();
  };

  return {
    secondaryStatus,
    loading,
    isSecondaryRoundActive,
    isCurrentFamilyTurn,
    getRemainingSecondaryPeriods,
    getSecondarySelectionOrder,
    startSecondarySelection,
    advanceSecondarySelection,
    endSecondarySelection,
    refetchSecondaryStatus: fetchSecondarySelectionStatus
  };
};