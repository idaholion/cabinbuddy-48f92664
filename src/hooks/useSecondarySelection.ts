import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { useRotationOrder } from '@/hooks/useRotationOrder';
import { useSelectionUsageDisplay } from '@/hooks/useSelectionUsageDisplay';
import { SELECTION_DISPLAY_REFRESH } from '@/lib/selection-display-events';
import { scheduleFreeSelectionOpening } from '@/lib/schedule-free-selection';
import { isRoundCompleted, nextIncompleteFamily } from '@/lib/selection-round-completion';
import { planSecondaryTransition } from '@/lib/secondary-selection-transition';
import { secureSelect, secureInsert, secureUpdate, assertOrganizationOwnership, createOrganizationContext } from '@/lib/secure-queries';

const pendingTransitions = new Map<string, Promise<void>>();

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

export const useSecondarySelection = (rotationYear: number, displayOnly = false) => {
  const { organization } = useOrganization();
  const { rotationData, getRotationForYear } = useRotationOrder(rotationYear);
  const { timePeriodUsage } = useSelectionUsageDisplay(rotationYear);
  
  const [secondaryStatus, setSecondaryStatus] = useState<SecondarySelectionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSecondaryRoundActive, setIsSecondaryRoundActive] = useState(false);
  const [selectionStartTime, setSelectionStartTime] = useState<Date | null>(null);
  
  // Use ref to avoid stale closure in real-time subscription
  const rotationYearRef = useRef(rotationYear);
  // Several screens use this hook at once; each needs its own live-update channel.
  const channelSuffixRef = useRef(Math.random().toString(36).slice(2));
  
  // Keep ref in sync with prop
  rotationYearRef.current = rotationYear;

  useEffect(() => {
    if (!organization?.id) return;
    fetchSecondarySelectionStatus();
    if (!displayOnly) checkIfSecondaryRoundShouldStart();
  }, [organization?.id, rotationYear, rotationData, timePeriodUsage]);

  useEffect(() => {
    const refresh = () => { void fetchSecondarySelectionStatus(); };
    window.addEventListener(SELECTION_DISPLAY_REFRESH, refresh);
    window.addEventListener('focus', refresh);
    return () => {
      window.removeEventListener(SELECTION_DISPLAY_REFRESH, refresh);
      window.removeEventListener('focus', refresh);
    };
  }, [organization?.id, rotationYear]);

  // Real-time subscription for secondary_selection_status updates
  useEffect(() => {
    if (!organization?.id) return;

    console.log('[Secondary Selection] Setting up real-time subscription for organization:', organization.id);
    
    const channel = supabase
      .channel(`secondary-selection-status-changes-${channelSuffixRef.current}`)
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
            const requestedYear = rotationYearRef.current;
            const { data, error } = await secureSelect('secondary_selection_status', createOrganizationContext(organization.id))
              .eq('rotation_year', requestedYear)
              .maybeSingle();

            if (rotationYearRef.current !== requestedYear) return;

            if (error && error.code !== 'PGRST116') {
              console.error('[Secondary Selection] Error fetching in real-time:', error);
              return;
            }

            console.log('[Secondary Selection] Real-time fetch result:', data);
            setSecondaryStatus(data);
            // Round is active if there's a current family with an incomplete turn, OR if the round has started (for phase detection)
            setIsSecondaryRoundActive(!!data?.started_at);
            
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

      // Ignore a late answer for a year this screen has already moved away from.
      if (rotationYearRef.current !== rotationYear) return;

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching secondary selection status:', error);
        return;
      }

      // Validate data ownership
      if (data) {
        assertOrganizationOwnership(data, orgContext);
      }

      setSecondaryStatus(data);
      // Round is active if started_at is set (for phase detection purposes)
      setIsSecondaryRoundActive(!!data?.started_at);
      
      // Track when current family started their selection
      if (data?.started_at) {
        setSelectionStartTime(new Date(data.started_at));
      }
    } catch (error) {
      console.error('Error in fetchSecondarySelectionStatus:', error);
    } finally {
      if (rotationYearRef.current === rotationYear) setLoading(false);
    }
  };

  // Both automatic recovery and the Done handoff use fresh, year-scoped records.
  const startSecondarySelection = async () => {
    if (!organization?.id) return;
    const context = createOrganizationContext(organization.id);
    const key = `${organization.id}:${rotationYear}`;
    const pending = pendingTransitions.get(key);
    if (pending) {
      await pending;
      await fetchSecondarySelectionStatus();
      return;
    }
    const transition = (async () => {
      const [settings, usage, status] = await Promise.all([
        secureSelect('rotation_orders', context).eq('rotation_year', rotationYear).maybeSingle(),
        secureSelect('time_period_usage', context).eq('rotation_year', rotationYear),
        secureSelect('secondary_selection_status', context).eq('rotation_year', rotationYear).maybeSingle(),
      ]);
      if (settings.error || usage.error || status.error) throw settings.error || usage.error || status.error;
      // Never restart an active or finished secondary round.
      if (status.data?.started_at || status.data?.current_family_group || !settings.data) return;
      const order = Array.isArray(settings.data.rotation_order)
        ? settings.data.rotation_order.map(String).filter((family: string) => family !== 'static_weeks_mode' && family !== 'manual_mode') : [];
      const plan = planSecondaryTransition(rotationYear, order, settings.data.enable_secondary_selection === true, usage.data || [], settings.data.secondary_max_periods || 1);
      if (!plan) return;
      const values = { ...plan, turn_completed: !plan.current_family_group, started_at: new Date().toISOString() };
      const result = status.data
        ? await secureUpdate('secondary_selection_status', values, context).eq('id', status.data.id).is('started_at', null).is('current_family_group', null)
        : await secureInsert('secondary_selection_status', { ...values, rotation_year: rotationYear }, context);
      // Another browser may have inserted the unique organization/year row first.
      if (result.error && result.error.code !== '23505') throw result.error;
      const saved = await secureSelect('secondary_selection_status', context).eq('rotation_year', rotationYear).maybeSingle();
      if (saved.error) throw saved.error;
      if (!saved.data?.started_at) throw new Error('Secondary selection did not start. Please try again.');
      const roundUpdate = await secureUpdate('time_period_usage', { selection_round: 'secondary' }, context).eq('rotation_year', rotationYear);
      if (roundUpdate.error) throw roundUpdate.error;
    })();
    pendingTransitions.set(key, transition);
    try {
      await transition;
      await fetchSecondarySelectionStatus();
    } finally {
      pendingTransitions.delete(key);
    }
  };

  const checkIfSecondaryRoundShouldStart = async () => {
    try {
      await startSecondarySelection();
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
      
      const [freshStatus, freshUsage] = await Promise.all([
        secureSelect('secondary_selection_status', orgContext).eq('rotation_year', rotationYear).maybeSingle(),
        secureSelect('time_period_usage', orgContext).eq('rotation_year', rotationYear),
      ]);
      if (freshStatus.error || freshUsage.error) throw freshStatus.error || freshUsage.error;
      const saved = freshStatus.data;
      const outgoing = secondaryStatus.current_family_group;
      if (!outgoing || saved?.current_family_group !== outgoing || saved?.started_at !== secondaryStatus.started_at) {
        throw new Error('The selection turn has changed. Please refresh the calendar.');
      }
      const outgoingUsage = freshUsage.data?.find((row: any) => row.family_group === outgoing);
      if (!outgoingUsage || isRoundCompleted(outgoingUsage, rotationYear, 'secondary')) throw new Error('This secondary turn is already complete or unavailable.');
      const nextFamily = nextIncompleteFamily(freshUsage.data || [], reverseOrder, rotationYear, 'secondary', outgoing);
      const nextIndex = nextFamily ? reverseOrder.indexOf(nextFamily) : reverseOrder.length;

      // If no one has remaining secondary periods, end the round with atomic update
      if (!nextFamily) {
        console.log('[useSecondarySelection] All families completed secondary selection, ending round');
        // ATOMIC: Mark turn completed AND clear current_family_group in one update
        const { data: ended, error: endError } = await secureUpdate('secondary_selection_status', {
          turn_completed: true,
          current_family_group: null,
          updated_at: new Date().toISOString()
        }, orgContext)
          .eq('id', secondaryStatus.id).eq('current_family_group', outgoing).eq('started_at', saved.started_at).select('id').maybeSingle();

        if (endError) {
          console.error('[useSecondarySelection] Error ending secondary selection:', endError);
          throw endError;
        }
        
        if (!ended) throw new Error('The selection turn changed before saving. Please refresh.');
        setIsSecondaryRoundActive(false);
        await scheduleFreeSelectionOpening(organization.id, rotationYear);
        await fetchSecondarySelectionStatus();
        return;
      }

      // ATOMIC UPDATE: Mark current turn completed AND set next family in one call
      const { data: advanced, error: advanceError } = await secureUpdate('secondary_selection_status', {
        turn_completed: false, // Reset for new family
        current_family_group: nextFamily,
        current_group_index: nextIndex,
        started_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, orgContext)
        .eq('id', secondaryStatus.id).eq('current_family_group', outgoing).eq('started_at', saved.started_at).select('id').maybeSingle();

      if (advanceError) {
        console.error('[useSecondarySelection] Error advancing secondary selection:', advanceError);
        throw advanceError;
      }

      if (!advanced) throw new Error('The selection turn changed before saving. Please refresh.');
      console.log(`[useSecondarySelection] Advanced to ${nextFamily} for secondary selection`);

      // Send notification to the next family
      try {
        const { data: notifyResponse, error: notifyError } = await supabase.functions.invoke('send-selection-turn-notification', {
          body: {
            organization_id: organization.id,
            family_group: nextFamily,
            rotation_year: rotationYear
          }
        });

        if (notifyError) {
          console.error('[useSecondarySelection] Error sending notification:', notifyError);
        } else if (notifyResponse?.success && !notifyResponse?.skipped) {
          console.log(`[useSecondarySelection] Notification sent to ${nextFamily} for secondary selection`);
        } else {
          console.log('[useSecondarySelection] Notification not delivered:', notifyResponse?.message || notifyResponse?.error);
        }
      } catch (notifyError) {
        console.error('[useSecondarySelection] Failed to send notification:', notifyError);
      }

      fetchSecondarySelectionStatus();
    } catch (error) {
      console.error('[useSecondarySelection] Error in advanceSecondarySelection:', error);
      throw error;
    }
  };

  // End only the outgoing turn; never clear waiting families to open free selection.
  const endSecondarySelection = advanceSecondarySelection;

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
    secondaryStatus: secondaryStatus?.rotation_year === rotationYear ? secondaryStatus : null,
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