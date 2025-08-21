import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { useRotationOrder } from '@/hooks/useRotationOrder';
import { useTimePeriods } from '@/hooks/useTimePeriods';
import { useSecondarySelection } from '@/hooks/useSecondarySelection';

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
}

export const useSequentialSelection = (rotationYear: number): UseSequentialSelectionReturn => {
  const { organization } = useOrganization();
  const { rotationData, getRotationForYear } = useRotationOrder();
  const { timePeriodUsage } = useTimePeriods();
  const { 
    secondaryStatus, 
    isSecondaryRoundActive, 
    isCurrentFamilyTurn,
    advanceSecondarySelection,
    endSecondarySelection 
  } = useSecondarySelection(rotationYear);

  const [loading, setLoading] = useState(true);
  const [currentPhase, setCurrentPhase] = useState<SelectionPhase>('primary');

  useEffect(() => {
    if (!rotationData || !timePeriodUsage.length) {
      setLoading(false);
      return;
    }

    // Determine current phase
    const rotationOrder = getRotationForYear(rotationYear);
    const allCompletedPrimary = rotationOrder.every(familyGroup => {
      const usage = timePeriodUsage.find(u => u.family_group === familyGroup);
      return usage && usage.time_periods_used >= (rotationData.max_time_slots || 2);
    });

    if (allCompletedPrimary && rotationData.enable_secondary_selection) {
      setCurrentPhase('secondary');
    } else {
      setCurrentPhase('primary');
    }
    
    setLoading(false);
  }, [rotationData, timePeriodUsage, getRotationForYear, rotationYear]);

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
        
        let status: SelectionStatus = 'waiting';
        if (usedPrimary >= allowedPrimary) {
          status = 'completed';
        }

        return {
          familyGroup,
          status,
          isCurrentTurn: false, // We'd need primary selection tracking for this
          daysRemaining: null
        };
      });
    }
  };

  const getCurrentFamilyGroup = (): string | null => {
    if (currentPhase === 'secondary') {
      return secondaryStatus?.current_family_group || null;
    }
    // For primary phase, we'd need to check reservation_periods table
    return null;
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
    }
    // Primary phase advancement would be handled differently
  };

  const getDaysRemaining = (familyGroup: string): number | null => {
    return calculateDaysRemaining(familyGroup, currentPhase);
  };

  return {
    currentPhase,
    familyStatuses: generateFamilyStatuses(),
    currentFamilyGroup: getCurrentFamilyGroup(),
    canCurrentUserSelect,
    advanceSelection,
    getDaysRemaining,
    loading
  };
};