import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { useRotationOrder } from '@/hooks/useRotationOrder';
import { useTimePeriods } from '@/hooks/useTimePeriods';
import { secureSelect, secureInsert, secureUpdate, assertOrganizationOwnership, createOrganizationContext } from '@/lib/secure-queries';

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
  const [selectionStartTime, setSelectionStartTime] = useState<Date | null>(null);
  
  // Use ref to avoid stale closure in real-time subscription
  const rotationYearRef = useRef(rotationYear);
  
  // Keep ref in sync with prop
  useEffect(() => {
    rotationYearRef.current = rotationYear;
  }, [rotationYear]);

  useEffect(() => {
    if (!organization?.id) return;
    fetchSecondarySelectionStatus();
    checkIfSecondaryRoundShouldStart();
  }, [organization?.id, rotationYear, timePeriodUsage]);

  // Real-time subscription for secondary_selection_status updates
  useEffect(() => {
    if (!organization?.id) return;

    console.log('[Secondary Selection] Setting up real-time subscription for organization:', organization.id);
    
    const channel = supabase
      .channel('secondary-selection-status-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'secondary_selection_status',
          filter: `organization_id=eq.${organization.id}`
        },
        async (payload) => {
          console.log('[Secondary Selection] Real-time event received:', payload);
          console.log('[Secondary Selection] Using rotation year from ref:', rotationYearRef.current);
          
          // Fetch with current rotation year from ref to avoid stale closure
          try {
            const { data, error } = await supabase
              .from('secondary_selection_status')
              .select('*')
              .eq('organization_id', organization.id)
              .eq('rotation_year', rotationYearRef.current)
              .maybeSingle();

            if (error && error.code !== 'PGRST116') {
              console.error('[Secondary Selection] Error fetching in real-time:', error);
              return;
            }

            console.log('[Secondary Selection] Real-time fetch result:', data);
            setSecondaryStatus(data);
            // Only treat as active if turn is NOT completed AND there's a current family
            setIsSecondaryRoundActive(!!data?.current_family_group && data?.turn_completed !== true);
            
            if (data?.started_at) {
              setSelectionStartTime(new Date(data.started_at));
            }
          } catch (error) {
            console.error('[Secondary Selection] Error in real-time callback:', error);
          }
        }
      )
      .subscribe((status) => {
        console.log('[Secondary Selection] Subscription status:', status);
      });

    return () => {
      console.log('[Secondary Selection] Cleaning up subscription');
      supabase.removeChannel(channel);
    };
  }, [organization?.id]);

  const fetchSecondarySelectionStatus = async () => {
    if (!organization?.id) return;

    try {
      const orgContext = createOrganizationContext(organization.id);
      const { data, error } = await secureSelect('secondary_selection_status', orgContext)
        .select('*')
        .eq('rotation_year', rotationYear)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching secondary selection status:', error);
        return;
      }

      // Validate data ownership
      if (data) {
        assertOrganizationOwnership(data, orgContext);
      }

      setSecondaryStatus(data);
      // Only treat as active if turn is NOT completed AND there's a current family
      setIsSecondaryRoundActive(!!data?.current_family_group && data?.turn_completed !== true);
      
      // Track when current family started their selection
      if (data?.started_at) {
        setSelectionStartTime(new Date(data.started_at));
      }
    } catch (error) {
      console.error('Error in fetchSecondarySelectionStatus:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkIfSecondaryRoundShouldStart = async () => {
    if (!organization?.id || !rotationData || !timePeriodUsage.length) return;

    // Check if all family groups have EXPLICITLY completed their primary selections (turn_completed = true)
    const rotationOrder = getRotationForYear(rotationYear);
    
    // Check turn_completed flags from database
    const completionChecks = await Promise.all(
      rotationOrder.map(async (familyGroup) => {
        const { data: turnData } = await supabase
          .from('time_period_usage')
          .select('turn_completed')
          .eq('organization_id', organization.id)
          .eq('rotation_year', rotationYear)
          .eq('family_group', familyGroup)
          .maybeSingle();
        
        return turnData?.turn_completed || false;
      })
    );
    
    const allCompletedPrimary = completionChecks.every(completed => completed);

    // Check if secondary selection is enabled
    const secondaryEnabled = rotationData.enable_secondary_selection;

    if (allCompletedPrimary && secondaryEnabled && !secondaryStatus) {
      console.log('[useSecondarySelection] Starting secondary selection round');
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

      const orgContext = createOrganizationContext(organization.id);
      const { error } = await secureInsert('secondary_selection_status', {
        rotation_year: rotationYear,
        current_family_group: firstEligibleFamily,
        current_group_index: reverseOrder.indexOf(firstEligibleFamily),
        turn_completed: false, // Start with turn not completed
        started_at: new Date().toISOString()
      }, orgContext);

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

    try {
      const orgContext = createOrganizationContext(organization.id);
      const rotationOrder = getRotationForYear(rotationYear);
      const reverseOrder = [...rotationOrder].reverse();
      
      // First check if any other family has remaining secondary periods
      let nextIndex = (secondaryStatus.current_group_index + 1) % reverseOrder.length;
      let nextFamily: string | null = null;
      let attempts = 0;
      
      while (attempts < reverseOrder.length) {
        const candidateFamily = reverseOrder[nextIndex];
        const usage = timePeriodUsage.find(u => u.family_group === candidateFamily);
        const remainingSecondary = (rotationData.secondary_max_periods || 1) - (usage?.secondary_periods_used || 0);
        
        if (remainingSecondary > 0) {
          nextFamily = candidateFamily;
          break;
        }
        
        nextIndex = (nextIndex + 1) % reverseOrder.length;
        attempts++;
      }

      // If no one has remaining secondary periods, end the round with atomic update
      if (!nextFamily || attempts >= reverseOrder.length) {
        console.log('[useSecondarySelection] All families completed secondary selection, ending round');
        // ATOMIC: Mark turn completed AND clear current_family_group in one update
        const { error: endError } = await secureUpdate('secondary_selection_status', {
          turn_completed: true,
          current_family_group: null,
          updated_at: new Date().toISOString()
        }, orgContext)
          .eq('id', secondaryStatus.id);

        if (endError) {
          console.error('[useSecondarySelection] Error ending secondary selection:', endError);
          throw endError;
        }
        
        setIsSecondaryRoundActive(false);
        fetchSecondarySelectionStatus();
        return;
      }

      // ATOMIC UPDATE: Mark current turn completed AND set next family in one call
      const { error: advanceError } = await secureUpdate('secondary_selection_status', {
        turn_completed: false, // Reset for new family
        current_family_group: nextFamily,
        current_group_index: nextIndex,
        started_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, orgContext)
        .eq('id', secondaryStatus.id);

      if (advanceError) {
        console.error('[useSecondarySelection] Error advancing secondary selection:', advanceError);
        throw advanceError;
      }

      console.log(`[useSecondarySelection] Advanced to ${nextFamily} for secondary selection`);

      // Send notification to the next family
      try {
        const { error: notifyError } = await supabase.functions.invoke('send-selection-turn-notification', {
          body: {
            organization_id: organization.id,
            family_group: nextFamily,
            rotation_year: rotationYear
          }
        });

        if (notifyError) {
          console.error('[useSecondarySelection] Error sending notification:', notifyError);
        } else {
          console.log(`[useSecondarySelection] Notification sent to ${nextFamily} for secondary selection`);
          
          // Track that notification was sent
          await supabase
            .from('selection_turn_notifications_sent')
            .insert({
              organization_id: organization.id,
              rotation_year: rotationYear,
              family_group: nextFamily,
              phase: 'secondary'
            });
        }
      } catch (notifyError) {
        console.error('[useSecondarySelection] Failed to send notification:', notifyError);
      }

      fetchSecondarySelectionStatus();
    } catch (error) {
      console.error('[useSecondarySelection] Error in advanceSecondarySelection:', error);
    }
  };

  const endSecondarySelection = async () => {
    if (!organization?.id || !secondaryStatus) return;

    const orgContext = createOrganizationContext(organization.id);
    const { error } = await secureUpdate('secondary_selection_status', {
      current_family_group: null,
      updated_at: new Date().toISOString()
    }, orgContext)
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

  const getCurrentSelectionDays = (): { daysPassed: number; totalDays: number; daysRemaining: number } | null => {
    if (!secondaryStatus?.current_family_group || !rotationData) return null;
    
    const startTime = selectionStartTime || (secondaryStatus.started_at ? new Date(secondaryStatus.started_at) : new Date());
    const totalDays = rotationData.secondary_selection_days || 7;
    const daysPassed = Math.floor((Date.now() - startTime.getTime()) / (24 * 60 * 60 * 1000));
    const daysRemaining = Math.max(0, totalDays - daysPassed);
    
    return {
      daysPassed: Math.min(daysPassed + 1, totalDays), // Show as Day 1, 2, 3, etc.
      totalDays,
      daysRemaining
    };
  };

  const hasSelectionTimeExpired = (): boolean => {
    const selectionDays = getCurrentSelectionDays();
    return selectionDays ? selectionDays.daysRemaining <= 0 : false;
  };

  return {
    secondaryStatus,
    loading,
    isSecondaryRoundActive,
    isCurrentFamilyTurn,
    getRemainingSecondaryPeriods,
    getSecondarySelectionOrder,
    getCurrentSelectionDays,
    hasSelectionTimeExpired,
    startSecondarySelection,
    advanceSecondarySelection,
    endSecondarySelection,
    checkIfSecondaryRoundShouldStart,
    refetchSecondaryStatus: fetchSecondarySelectionStatus
  };
};