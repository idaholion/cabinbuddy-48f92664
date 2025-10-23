import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { useRotationOrder } from '@/hooks/useRotationOrder';
import { useTimePeriods } from '@/hooks/useTimePeriods';
import { useSecondarySelection } from '@/hooks/useSecondarySelection';
import { useSelectionExtensions } from '@/hooks/useSelectionExtensions';
import { getFirstNameFromFullName } from '@/lib/reservation-utils';

export type SelectionPhase = 'primary' | 'secondary';
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
}

export const useSequentialSelection = (rotationYear: number): UseSequentialSelectionReturn => {
  const { organization } = useOrganization();
  const { rotationData, getRotationForYear, calculateRotationForYear: calcRotation } = useRotationOrder();
  const { timePeriodUsage } = useTimePeriods(rotationYear);
  const { getExtensionForFamily } = useSelectionExtensions(rotationYear);
  const { 
    secondaryStatus, 
    isSecondaryRoundActive, 
    isCurrentFamilyTurn,
    advanceSecondarySelection,
    endSecondarySelection 
  } = useSecondarySelection(rotationYear);

  const [loading, setLoading] = useState(true);
  const [currentPhase, setCurrentPhase] = useState<SelectionPhase>('primary');
  const [primaryCurrentFamily, setPrimaryCurrentFamily] = useState<string | null>(null);

  useEffect(() => {
    console.log('[useSequentialSelection] Component mount/update:', {
      hasRotationData: !!rotationData,
      timePeriodUsageCount: timePeriodUsage.length,
      organizationId: organization?.id,
      rotationYear
    });

    if (!rotationData || !timePeriodUsage.length || !organization?.id) {
      setLoading(false);
      return;
    }

    const checkPhaseAndFamily = async () => {
      // Determine current phase - use CALCULATED rotation for target year
      const rotationOrder = getRotationForYear(rotationYear);
      
      console.log('[useSequentialSelection] Calculated rotation order for year:', {
        targetYear: rotationYear,
        baseYear: rotationData?.rotation_year,
        baseOrder: rotationData?.rotation_order,
        calculatedOrder: rotationOrder,
        firstLastOption: rotationData?.first_last_option
      });
      
      // Check if all families have completed their turns (not just reached their limit)
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

      console.log('[useSequentialSelection] Phase determination:', {
        allCompletedPrimary,
        completionChecks,
        rotationOrder,
        enableSecondarySelection: rotationData.enable_secondary_selection,
        decidedPhase: allCompletedPrimary && rotationData.enable_secondary_selection ? 'secondary' : 'primary'
      });

      if (allCompletedPrimary && rotationData.enable_secondary_selection) {
        setCurrentPhase('secondary');
      } else {
        setCurrentPhase('primary');
        // Determine current family for primary phase
        await determinePrimaryCurrentFamily(rotationOrder);
      }
      
      setLoading(false);
    };

    checkPhaseAndFamily();
  }, [rotationData, timePeriodUsage, getRotationForYear, rotationYear, organization?.id, getExtensionForFamily]);

  // Determine which family group's turn it is in primary phase
  const determinePrimaryCurrentFamily = async (rotationOrder: string[]) => {
    if (!organization?.id || !rotationData) return;

    console.log('[useSequentialSelection] determinePrimaryCurrentFamily called:', {
      rotationOrder,
      timePeriodUsage,
      maxTimeSlots: rotationData.max_time_slots
    });

    // Fetch reservation periods to check scheduled dates
    const { data: periods, error } = await supabase
      .from('reservation_periods')
      .select('*')
      .eq('organization_id', organization.id)
      .eq('rotation_year', rotationYear)
      .order('current_group_index');

    console.log('[useSequentialSelection] Fetched periods:', {
      periodsCount: periods?.length || 0,
      error: error?.message,
      rotationYear,
      periods: periods?.map(p => ({
        family: p.current_family_group,
        start: p.selection_start_date,
        end: p.selection_end_date
      }))
    });

    if (error) {
      console.error('[useSequentialSelection] Error fetching periods:', error);
      // Fall back to rotation order logic
      fallbackToRotationOrder(rotationOrder);
      return;
    }

    if (!periods || periods.length === 0) {
      console.log('[useSequentialSelection] No periods found, using rotation order');
      // No scheduled periods, use rotation order
      fallbackToRotationOrder(rotationOrder);
      return;
    }

    // Check which family's selection period is active based on today's date
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    console.log('[useSequentialSelection] Checking periods against today:', today.toISOString());
    
    for (const period of periods) {
      const startDate = new Date(period.selection_start_date + 'T00:00:00');
      const endDate = new Date(period.selection_end_date + 'T00:00:00');
      
      console.log('[useSequentialSelection] Checking period:', {
        family: period.current_family_group,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        todayInRange: today >= startDate && today <= endDate
      });
      
      // Check if today falls within this period's date range
      if (today >= startDate && today <= endDate) {
        // Also verify this family still has selections available
        const usage = timePeriodUsage.find(u => u.family_group === period.current_family_group);
        const used = usage?.time_periods_used || 0;
        const allowed = rotationData.max_time_slots || 2;
        
        // Check for active extension
        const extension = getExtensionForFamily(period.current_family_group);
        const hasActiveExtension = extension && new Date(extension.extended_until) >= new Date();
        
        console.log('[useSequentialSelection] Period matches today, checking eligibility:', {
          family: period.current_family_group,
          used,
          allowed,
          hasExtension: hasActiveExtension,
          canSelect: used < allowed || hasActiveExtension
        });
        
        if (used < allowed || hasActiveExtension) {
          console.log('[useSequentialSelection] Setting current family based on scheduled period:', period.current_family_group);
          setPrimaryCurrentFamily(period.current_family_group);
          return;
        } else {
          console.log('[useSequentialSelection] Family has no selections remaining:', period.current_family_group);
        }
      }
    }
    
    console.log('[useSequentialSelection] No active period found, using rotation order');
    // If no period is active today, fall back to rotation order
    fallbackToRotationOrder(rotationOrder);
  };

  const fallbackToRotationOrder = async (rotationOrder: string[]) => {
    if (!organization?.id) return;
    
    // Find the first family group that hasn't explicitly completed their turn
    for (const familyGroup of rotationOrder) {
      const usage = timePeriodUsage.find(u => u.family_group === familyGroup);
      const used = usage?.time_periods_used || 0;
      const allowed = rotationData?.max_time_slots || 2;
      
      // Check if family has an active extension
      const extension = getExtensionForFamily(familyGroup);
      const hasActiveExtension = extension && new Date(extension.extended_until) >= new Date();
      
      // Check turn_completed flag from database
      const { data: turnData } = await supabase
        .from('time_period_usage')
        .select('turn_completed')
        .eq('organization_id', organization.id)
        .eq('rotation_year', rotationYear)
        .eq('family_group', familyGroup)
        .maybeSingle();
      
      const turnCompleted = turnData?.turn_completed || false;
      
      console.log('[useSequentialSelection] Family eligibility check:', {
        familyGroup,
        used,
        allowed,
        turnCompleted,
        hasActiveExtension,
        decision: !turnCompleted ? 'SET AS CURRENT (turn not completed)' : 'SKIP (turn completed)',
        rotationYear
      });
      
      // CRITICAL FIX: Only skip to next family if they've explicitly completed their turn
      // A family reaching their limit does NOT automatically complete their turn
      if (!turnCompleted) {
        console.log('[useSequentialSelection] Setting current family (turn not completed):', familyGroup);
        setPrimaryCurrentFamily(familyGroup);
        return;
      }
    }
    
    // If all have completed, no current family
    setPrimaryCurrentFamily(null);
  };

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
    
    if (currentPhase === 'secondary') {
      const secondaryOrder = [...rotationOrder].reverse();
      
      return secondaryOrder.map((familyGroup, index) => {
        const usage = timePeriodUsage.find(u => u.family_group === familyGroup);
        const usedSecondary = usage?.secondary_periods_used || 0;
        const allowedSecondary = rotationData.secondary_max_periods || 1;
        const remainingSecondary = allowedSecondary - usedSecondary;
        
        let status: SelectionStatus = 'waiting';
        let dayCountText: string | undefined;
        const isCurrentTurn = isCurrentFamilyTurn(familyGroup);
        
        if (remainingSecondary <= 0) {
          status = 'completed';
        } else if (isCurrentTurn) {
          status = 'active';
          const daysRemaining = calculateDaysRemaining(familyGroup, 'secondary');
          if (daysRemaining !== null) {
            const totalDays = rotationData.secondary_selection_days || 7;
            const daysPassed = totalDays - daysRemaining;
            dayCountText = `Day ${daysPassed + 1} of ${totalDays}`;
          }
        } else if (isSecondaryRoundActive) {
          // Check if this family comes before current family in secondary order
          const currentIndex = secondaryOrder.findIndex(f => isCurrentFamilyTurn(f));
          if (currentIndex !== -1 && index < currentIndex) {
            status = 'completed';
          }
        }

        return {
          familyGroup,
          status,
          dayCountText,
          isCurrentTurn,
          daysRemaining: calculateDaysRemaining(familyGroup, 'secondary')
        };
      });
    } else {
      // Primary phase logic
      return rotationOrder.map((familyGroup, index) => {
        const usage = timePeriodUsage.find(u => u.family_group === familyGroup);
        const usedPrimary = usage?.time_periods_used || 0;
        const allowedPrimary = rotationData.max_time_slots || 2;
        
        // Check for active extension
        const extension = getExtensionForFamily(familyGroup);
        const hasActiveExtension = extension && new Date(extension.extended_until) >= new Date();
        
        const isCurrentTurn = primaryCurrentFamily === familyGroup;
        let status: SelectionStatus = 'waiting';
        
        // Set status based on current turn and completion
        if (isCurrentTurn) {
          status = 'active';
        } else if (usedPrimary >= allowedPrimary && !hasActiveExtension) {
          status = 'completed';
        }

        return {
          familyGroup,
          status,
          isCurrentTurn,
          daysRemaining: null
        };
      });
    }
  };

  const getCurrentFamilyGroup = (): string | null => {
    if (currentPhase === 'secondary') {
      return secondaryStatus?.current_family_group || null;
    }
    return primaryCurrentFamily;
  };

  const canCurrentUserSelect = (userFamilyGroup?: string): boolean => {
    if (!userFamilyGroup) return false;
    
    const currentFamily = getCurrentFamilyGroup();
    const canSelect = currentFamily === userFamilyGroup;
    
    console.log('[useSequentialSelection] canCurrentUserSelect check:', {
      userFamilyGroup,
      currentFamily,
      primaryCurrentFamily,
      currentPhase,
      canSelect,
      rotationYear
    });
    
    return canSelect;
  };

  const advanceSelection = async (completed: boolean = false): Promise<void> => {
    if (currentPhase === 'secondary') {
      if (completed) {
        await advanceSecondarySelection();
      } else {
        await endSecondarySelection();
      }
    } else {
      // Primary phase advancement
      await advancePrimarySelection();
    }
  };

  const advancePrimarySelection = async (): Promise<void> => {
    if (!organization?.id || !rotationData || !primaryCurrentFamily) return;

    console.log('[useSequentialSelection] Advancing primary selection from:', primaryCurrentFamily);

    try {
      // CRITICAL: Mark current family's turn as completed in the database
      const { error: updateError } = await supabase
        .from('time_period_usage')
        .update({ turn_completed: true })
        .eq('organization_id', organization.id)
        .eq('rotation_year', rotationYear)
        .eq('family_group', primaryCurrentFamily);

      if (updateError) {
        console.error('[useSequentialSelection] Error marking turn as completed:', updateError);
        throw updateError;
      }

      console.log('[useSequentialSelection] Marked turn as completed for:', primaryCurrentFamily);

      const rotationOrder = getRotationForYear(rotationYear);
      const currentIndex = rotationOrder.indexOf(primaryCurrentFamily);
      
      // Find next family group that hasn't completed their turn
      for (let i = 1; i <= rotationOrder.length; i++) {
        const nextIndex = (currentIndex + i) % rotationOrder.length;
        const nextFamily = rotationOrder[nextIndex];
        
        // Check if next family has completed their turn
        const { data: nextTurnData } = await supabase
          .from('time_period_usage')
          .select('turn_completed')
          .eq('organization_id', organization.id)
          .eq('rotation_year', rotationYear)
          .eq('family_group', nextFamily)
          .maybeSingle();
        
        const nextTurnCompleted = nextTurnData?.turn_completed || false;
        
        // Advance to first family that hasn't completed their turn
        if (!nextTurnCompleted) {
          console.log('[useSequentialSelection] Advancing to next family:', nextFamily);
          setPrimaryCurrentFamily(nextFamily);
          
          // Send notification to the next family
          await sendSelectionTurnNotification(nextFamily, rotationYear);
          return;
        }
      }
      
      // If all families have completed, end primary phase
      console.log('[useSequentialSelection] All families have completed primary phase');
      setPrimaryCurrentFamily(null);
    } catch (error) {
      console.error('[useSequentialSelection] Error in advancePrimarySelection:', error);
    }
  };

  const sendSelectionTurnNotification = async (familyGroup: string, year: number): Promise<void> => {
    if (!organization?.id) return;

    try {
      // Get family group lead contact information
      const { data: familyData, error: familyError } = await supabase
        .from('family_groups')
        .select('lead_name, lead_email, lead_phone')
        .eq('organization_id', organization.id)
        .eq('name', familyGroup)
        .maybeSingle();

      if (familyError || !familyData?.lead_email) {
        console.error('Could not find family group contact info:', familyError);
        return;
      }

      // Calculate available periods (simplified - you may want to make this more accurate)
      const remainingUsage = timePeriodUsage.find(u => u.family_group === familyGroup);
      const used = remainingUsage?.time_periods_used || 0;
      const allowed = rotationData?.max_time_slots || 2;
      const availablePeriods = `${allowed - used} time periods remaining`;

      // Send the notification
      const { error: notificationError } = await supabase.functions.invoke('send-notification', {
        body: {
          type: 'selection_turn_ready',
          organization_id: organization.id,
          selection_data: {
            family_group_name: familyGroup,
            guest_email: familyData.lead_email,
            guest_name: getFirstNameFromFullName(familyData.lead_name || familyGroup),
            guest_phone: familyData.lead_phone,
            selection_year: year.toString(),
            available_periods: availablePeriods,
          }
        }
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
    loading,
    getUserUsageInfo
  };
};