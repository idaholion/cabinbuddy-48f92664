import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { useRotationOrder } from '@/hooks/useRotationOrder';
import { useTimePeriods } from '@/hooks/useTimePeriods';
import { useSecondarySelection } from '@/hooks/useSecondarySelection';
import { useSelectionExtensions } from '@/hooks/useSelectionExtensions';
import { useReservationPeriods } from '@/hooks/useReservationPeriods';
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
  const { generateSecondaryPeriods } = useReservationPeriods();
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
    if (!rotationData || !timePeriodUsage.length || !organization?.id) {
      setLoading(false);
      return;
    }

    const checkPhaseAndFamily = async () => {
      // Determine current phase - use CALCULATED rotation for target year
      const rotationOrder = getRotationForYear(rotationYear);
      
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

      // Check if secondary periods exist in database
      const { data: secondaryPeriods } = await supabase
        .from('reservation_periods')
        .select('id')
        .eq('organization_id', organization.id)
        .eq('rotation_year', rotationYear)
        .gte('current_group_index', rotationOrder.length)
        .limit(1);

      const hasSecondaryPeriods = secondaryPeriods && secondaryPeriods.length > 0;

      if (allCompletedPrimary && rotationData.enable_secondary_selection && hasSecondaryPeriods) {
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
  // Now uses explicit current_primary_turn_family field from rotation_orders
  const determinePrimaryCurrentFamily = async (rotationOrder: string[]) => {
    if (!organization?.id || !rotationData) return;

    // Read the explicit current_primary_turn_family field
    const { data: rotationOrderData, error } = await supabase
      .from('rotation_orders')
      .select('current_primary_turn_family')
      .eq('organization_id', organization.id)
      .eq('rotation_year', rotationYear)
      .maybeSingle();

    if (error) {
      console.error('[useSequentialSelection] Error fetching current_primary_turn_family:', error);
      return;
    }

    const currentFamily = rotationOrderData?.current_primary_turn_family || null;
    setPrimaryCurrentFamily(currentFamily);
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
    return currentFamily === userFamilyGroup;
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

      // Clean up any "ending tomorrow" notification records for this family
      const { error: cleanupError } = await supabase
        .from('selection_turn_notifications_sent')
        .delete()
        .eq('organization_id', organization.id)
        .eq('rotation_year', rotationYear)
        .eq('family_group', primaryCurrentFamily)
        .eq('phase', 'ending_tomorrow');

      if (cleanupError) {
        console.error('[useSequentialSelection] Error cleaning up ending_tomorrow notifications:', cleanupError);
      }

      const rotationOrder = getRotationForYear(rotationYear);
      const currentIndex = rotationOrder.indexOf(primaryCurrentFamily);
      
      // Find next family group that hasn't completed their turn
      let nextFamily: string | null = null;
      for (let i = 1; i <= rotationOrder.length; i++) {
        const nextIndex = (currentIndex + i) % rotationOrder.length;
        const candidateFamily = rotationOrder[nextIndex];
        
        // Check if next family has completed their turn
        const { data: nextTurnData } = await supabase
          .from('time_period_usage')
          .select('turn_completed')
          .eq('organization_id', organization.id)
          .eq('rotation_year', rotationYear)
          .eq('family_group', candidateFamily)
          .maybeSingle();
        
        const nextTurnCompleted = nextTurnData?.turn_completed || false;
        
        // Advance to first family that hasn't completed their turn
        if (!nextTurnCompleted) {
          nextFamily = candidateFamily;
          break;
        }
      }
      
      // Update current_primary_turn_family in rotation_orders
      const { error: rotationUpdateError } = await supabase
        .from('rotation_orders')
        .update({ current_primary_turn_family: nextFamily })
        .eq('organization_id', organization.id)
        .eq('rotation_year', rotationYear);

      if (rotationUpdateError) {
        console.error('[useSequentialSelection] Error updating current_primary_turn_family:', rotationUpdateError);
        throw rotationUpdateError;
      }

      if (nextFamily) {
        setPrimaryCurrentFamily(nextFamily);
        
        // Update next family's selection start date to TODAY
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
        const newEndDate = new Date();
        newEndDate.setDate(newEndDate.getDate() + (rotationData.selection_days || 14) - 1);
        const formattedEndDate = newEndDate.toISOString().split('T')[0];
        
        const { error: periodUpdateError } = await supabase
          .from('reservation_periods')
          .update({
            selection_start_date: today,
            selection_end_date: formattedEndDate
          })
          .eq('organization_id', organization.id)
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
        
        // If secondary selection is enabled, generate secondary periods
        if (rotationData.enable_secondary_selection) {
          await generateSecondaryPeriods(rotationYear);
        }
      }
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