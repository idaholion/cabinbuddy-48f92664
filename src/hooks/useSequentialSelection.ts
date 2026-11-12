import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { useRotationOrder } from '@/hooks/useRotationOrder';
import { useSelectionUsageDisplay } from '@/hooks/useSelectionUsageDisplay';
import { SELECTION_DISPLAY_REFRESH } from '@/lib/selection-display-events';
import { useSecondarySelection } from '@/hooks/useSecondarySelection';
import { useReservationPeriods } from '@/hooks/useReservationPeriods';
import { secureSelect, secureUpdate, secureDelete, createOrganizationContext } from '@/lib/secure-queries';
import { isRoundCompleted, completionPhase, nextIncompleteFamily } from '@/lib/selection-round-completion';

export type SelectionPhase = 'primary' | 'secondary' | 'post_rotation';
export type SelectionStatus = 'waiting' | 'active' | 'completed' | 'skipped';

interface FamilySelectionStatus {
  familyGroup: string;
  status: SelectionStatus;
  daysRemaining?: number;
  dayCountText?: string;
  isCurrentTurn: boolean;
}

interface UseSequentialSelectionReturn {
  currentPhase: SelectionPhase;
  familyStatuses: FamilySelectionStatus[];
  currentFamilyGroup: string | null;
  canCurrentUserSelect: (userFamilyGroup?: string) => boolean;
  advanceSelection: (completed?: boolean) => Promise<void>;
  getDaysRemaining: (familyGroup: string) => number | null;
  loading: boolean;
  getUserUsageInfo: (userFamilyGroup: string) => { used: number; allowed: number; remaining: number } | null;
  secondarySelectionStartDate: Date | null;
}

export const useSequentialSelection = (rotationYear: number): UseSequentialSelectionReturn => {
  const { organization } = useOrganization();
  const { rotationData, getRotationForYear, calculateRotationForYear: calcRotation } = useRotationOrder(rotationYear);
  const { timePeriodUsage, fetchTimePeriodUsage, loading: usageLoading } = useSelectionUsageDisplay(rotationYear);
  const { generateSecondaryPeriods } = useReservationPeriods(rotationYear);
  const { 
    secondaryStatus, 
    isSecondaryRoundActive, 
    isCurrentFamilyTurn,
    advanceSecondarySelection,
    startSecondarySelection
  } = useSecondarySelection(rotationYear, true);

  const [loading, setLoading] = useState(true);
  const [currentPhase, setCurrentPhase] = useState<SelectionPhase>('primary');
  const [primaryCurrentFamily, setPrimaryCurrentFamily] = useState<string | null>(null);
  const [resolvedKey, setResolvedKey] = useState<string | null>(null);
  const key = `${organization?.id}:${rotationYear}`;
  const latestKey = useRef(key);
  latestKey.current = key;
  const [refreshVersion, setRefreshVersion] = useState(0);
  useEffect(() => {
    const refresh = () => setRefreshVersion(v => v + 1);
    window.addEventListener(SELECTION_DISPLAY_REFRESH, refresh);
    window.addEventListener('focus', refresh);
    return () => {
      window.removeEventListener(SELECTION_DISPLAY_REFRESH, refresh);
      window.removeEventListener('focus', refresh);
    };
  }, []);
  
  useEffect(() => {
    if (!rotationData || !organization?.id) {
      setLoading(false);
      return;
    }

    let isMounted = true;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;

    const checkPhaseAndFamily = async () => {
      // Determine current phase - use CALCULATED rotation for target year
      const rotationOrder = getRotationForYear(rotationYear);
      
      if (!isMounted) return;

      const [usageResult, secondaryResult, primaryResult] = await Promise.all([
        secureSelect('time_period_usage', createOrganizationContext(organization.id)).eq('rotation_year', rotationYear),
        secureSelect('secondary_selection_status', createOrganizationContext(organization.id)).eq('rotation_year', rotationYear).maybeSingle(),
        secureSelect('rotation_orders', createOrganizationContext(organization.id)).eq('rotation_year', rotationYear).maybeSingle(),
      ]);
      if (!isMounted) return;
      if (usageResult.error || secondaryResult.error || primaryResult.error) {
        retryTimer = setTimeout(() => { if (isMounted) void checkPhaseAndFamily(); }, 3000);
        return;
      }
      setPrimaryCurrentFamily(primaryResult.data?.current_primary_turn_family || null);
      setCurrentPhase(completionPhase(usageResult.data || [], rotationOrder, rotationYear, secondaryResult.data));

      if (isMounted) {
        setResolvedKey(key);
        setLoading(false);
      }
    };

    checkPhaseAndFamily();

    return () => {
      isMounted = false;
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [rotationData, rotationYear, organization?.id, secondaryStatus, timePeriodUsage, refreshVersion]);

  const calculateDaysRemaining = (familyGroup: string, phase: SelectionPhase): number | null => {
    if (!rotationData) return null;

    if (phase === 'secondary' && secondaryStatus?.current_family_group === familyGroup) {
      const startedAt = secondaryStatus.started_at ? new Date(secondaryStatus.started_at) : new Date();
      const allowedDays = rotationData.secondary_selection_days || 7;
      const daysPassed = Math.floor((Date.now() - startedAt.getTime()) / (24 * 60 * 60 * 1000));
      return Math.max(0, allowedDays - daysPassed);
    }

    // For primary phase, we'd need similar logic with reservation_periods table
    return null;
  };

  const generateFamilyStatuses = (): FamilySelectionStatus[] => {
    if (!rotationData) return [];

    const rotationOrder = getRotationForYear(rotationYear);
    
    if (currentPhase === 'post_rotation') return [];
    const round = currentPhase === 'secondary' ? 'secondary' : 'primary';
    const order = round === 'secondary' ? [...rotationOrder].reverse() : rotationOrder;
    return order.map(familyGroup => {
      const usage = timePeriodUsage.find(u => u.family_group === familyGroup);
      const completed = isRoundCompleted(usage, rotationYear, round);
      const isCurrentTurn = !completed && (round === 'secondary' ? isCurrentFamilyTurn(familyGroup) : primaryCurrentFamily === familyGroup);
      return { familyGroup, status: (completed ? 'completed' : isCurrentTurn ? 'active' : 'waiting') as SelectionStatus,
        isCurrentTurn, daysRemaining: calculateDaysRemaining(familyGroup, currentPhase) };
    });
  };

  const getCurrentFamilyGroup = (): string | null => {
    if (currentPhase === 'secondary') {
      return secondaryStatus?.current_family_group || null;
    }
    return currentPhase === 'post_rotation' ? null : primaryCurrentFamily;
  };

  const canCurrentUserSelect = (userFamilyGroup?: string): boolean => {
    if (!userFamilyGroup) return false;
    
    const currentFamily = getCurrentFamilyGroup();
    return currentFamily === userFamilyGroup;
  };

  const advanceSelection = async (completed: boolean = false): Promise<void> => {
    if (currentPhase === 'secondary') {
      if (completed) {
        await advanceSecondarySelection();
      }
    } else {
      // Primary phase advancement
      await advancePrimarySelection();
    }
  };

  const advancePrimarySelection = async (): Promise<void> => {
    if (!organization?.id || !rotationData || !primaryCurrentFamily) return;

    try {
      const context = createOrganizationContext(organization.id);
      const [savedTurn, savedUsage] = await Promise.all([
        secureSelect('rotation_orders', context).eq('rotation_year', rotationYear).maybeSingle(),
        secureSelect('time_period_usage', context).eq('rotation_year', rotationYear),
      ]);
      if (savedTurn.error || savedUsage.error) throw savedTurn.error || savedUsage.error;
      if (savedTurn.data?.current_primary_turn_family !== primaryCurrentFamily) throw new Error('The selection turn has changed. Please refresh the calendar.');
      const outgoing = savedUsage.data?.find((row: any) => row.family_group === primaryCurrentFamily);
      if (!outgoing) throw new Error('This selection turn is unavailable. Please refresh the calendar.');
      const rotationOrder = getRotationForYear(rotationYear);
      const nextFamily = nextIncompleteFamily(savedUsage.data || [], rotationOrder, rotationYear, 'primary', primaryCurrentFamily);
      // Keep the legacy primary flag compatible; neither flag belongs to Round 2.
      const { error: updateError } = await secureUpdate('time_period_usage', { primary_turn_completed: true, turn_completed: true }, createOrganizationContext(organization.id))
        .eq('rotation_year', rotationYear)
        .eq('family_group', primaryCurrentFamily);

      if (updateError) {
        console.error('[useSequentialSelection] Error marking turn as completed:', updateError);
        throw updateError;
      }

      // Clean up any "ending tomorrow" notification records for this family
      const { error: cleanupError } = await secureDelete('selection_turn_notifications_sent', createOrganizationContext(organization.id))
        .eq('rotation_year', rotationYear)
        .eq('family_group', primaryCurrentFamily)
        .eq('phase', 'ending_tomorrow');

      if (cleanupError) {
        console.error('[useSequentialSelection] Error cleaning up ending_tomorrow notifications:', cleanupError);
      }

      // Update current_primary_turn_family in rotation_orders
      const { data: advanced, error: rotationUpdateError } = await secureUpdate('rotation_orders', { current_primary_turn_family: nextFamily }, createOrganizationContext(organization.id))
        .eq('rotation_year', rotationYear).eq('current_primary_turn_family', primaryCurrentFamily).select('id').maybeSingle();

      if (rotationUpdateError) {
        console.error('[useSequentialSelection] Error updating current_primary_turn_family:', rotationUpdateError);
        throw rotationUpdateError;
      }
      if (!advanced) throw new Error('The selection turn changed before saving. Please refresh the calendar.');

      if (nextFamily) {
        setPrimaryCurrentFamily(nextFamily);
        
        // Update next family's selection start date to TODAY
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
        const newEndDate = new Date();
        newEndDate.setDate(newEndDate.getDate() + (rotationData.selection_days || 14) - 1);
        const formattedEndDate = newEndDate.toISOString().split('T')[0];
        
        const { error: periodUpdateError } = await secureUpdate('reservation_periods', {
            selection_start_date: today,
            selection_end_date: formattedEndDate
          }, createOrganizationContext(organization.id))
          .eq('rotation_year', rotationYear)
          .eq('current_family_group', nextFamily);
        
        if (periodUpdateError) {
          console.error('[useSequentialSelection] Error updating next period dates:', periodUpdateError);
        }
        
        // Send notification to the next family
        await sendSelectionTurnNotification(nextFamily, rotationYear);
      } else {
        // All families have completed primary phase
        setPrimaryCurrentFamily(null);
        
        // If secondary selection is enabled, generate secondary periods and start secondary round
        if (rotationData.enable_secondary_selection) {
          console.log('[useSequentialSelection] Primary complete, generating secondary periods');
          await startSecondarySelection();
          // This legacy generator takes the selection-calendar year, not the stay year.
          await generateSecondaryPeriods(rotationYear - 1);
          setCurrentPhase('secondary');
          
          // Trigger check to start secondary selection round
          console.log('[useSequentialSelection] Triggering secondary selection start');
          await fetchTimePeriodUsage(rotationYear);
        }
      }
    } catch (error) {
      console.error('[useSequentialSelection] Error in advancePrimarySelection:', error);
      throw error;
    }
  };

  const sendSelectionTurnNotification = async (familyGroup: string, year: number): Promise<void> => {
    if (!organization?.id) return;

    try {
      const { error: notificationError } = await supabase.functions.invoke('send-selection-turn-notification', {
        body: { organization_id: organization.id, family_group: familyGroup, rotation_year: year }
      });

      if (notificationError) {
        console.error('Error sending selection turn notification:', notificationError);
      } else {
        console.log(`Selection turn notification sent to ${familyGroup}`);
      }
    } catch (error) {
      console.error('Error in sendSelectionTurnNotification:', error);
    }
  };

  const getDaysRemaining = (familyGroup: string): number | null => {
    return calculateDaysRemaining(familyGroup, currentPhase);
  };

  const getUserUsageInfo = (userFamilyGroup: string): { used: number; allowed: number; remaining: number } | null => {
    if (!rotationData) return null;
    
    const usage = timePeriodUsage.find(u => u.family_group === userFamilyGroup);
    
    console.log('[DEBUG] getUserUsageInfo called:', {
      userFamilyGroup,
      allUsageData: timePeriodUsage,
      foundUsage: usage,
      rotationYear,
      currentPhase
    });
    
    if (currentPhase === 'primary') {
      const used = usage?.time_periods_used || 0;
      const allowed = rotationData.max_time_slots || 2;
      const result = { used, allowed, remaining: allowed - used };
      console.log('[DEBUG] getUserUsageInfo PRIMARY result:', result);
      return result;
    } else {
      const used = usage?.secondary_periods_used || 0;
      const allowed = rotationData.secondary_max_periods || 1;
      const result = { used, allowed, remaining: allowed - used };
      console.log('[DEBUG] getUserUsageInfo SECONDARY result:', result);
      return result;
    }
  };

  return {
    currentPhase,
    familyStatuses: generateFamilyStatuses(),
    currentFamilyGroup: getCurrentFamilyGroup(),
    canCurrentUserSelect,
    advanceSelection,
    getDaysRemaining,
    loading: loading || resolvedKey !== key || usageLoading,
    getUserUsageInfo,
    secondarySelectionStartDate: secondaryStatus?.started_at ? new Date(secondaryStatus.started_at) : null
  };
};