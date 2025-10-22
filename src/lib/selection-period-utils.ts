import { differenceInDays } from 'date-fns';
import { parseDateOnly, toDateOnlyString } from '@/lib/date-utils';

export interface SelectionPeriodDisplayInfo {
  familyGroup: string;
  status: 'scheduled' | 'active' | 'completed';
  scheduledStartDate: string;
  scheduledEndDate: string;
  actualStartDate?: string;
  daysUntilScheduled: number;
  isCurrentlyActive: boolean;
  displayText: string;
  daysRemaining?: number;
}

export interface ReservationPeriod {
  id: string;
  organization_id: string;
  rotation_year: number;
  current_family_group: string;
  current_group_index: number;
  selection_start_date: string;
  selection_end_date: string;
  reservations_completed: boolean | null;
  created_at: string;
  updated_at: string;
}

/**
 * Merges scheduled reservation periods with actual sequential selection status
 * to provide accurate display information about selection periods
 */
export const getSelectionPeriodDisplayInfo = (
  periods: ReservationPeriod[],
  currentFamilyGroup: string | null,
  getDaysRemaining?: (familyGroup: string) => number,
  selectionDays: number = 14
): SelectionPeriodDisplayInfo[] => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  console.log('[getSelectionPeriodDisplayInfo] Called with:', {
    periodsCount: periods.length,
    currentFamilyGroup,
    selectionDays,
    periods: periods.map(p => ({ family: p.current_family_group, start: p.selection_start_date }))
  });

  // Find the index of the active family
  const activeIndex = currentFamilyGroup 
    ? periods.findIndex(p => p.current_family_group === currentFamilyGroup)
    : -1;

  // Create a map to store calculated dates for each family
  const familyDates = new Map<string, { actualStartDate: string; actualEndDate: string; daysUntilActual: number }>();
  
  // If there's an active family, calculate sequential dates starting from them
  if (activeIndex >= 0) {
    let nextDate = new Date(today);
    
    // Process families in order: active family, then those after in array, then wrap to beginning
    for (let i = 0; i < periods.length; i++) {
      const currentIndex = (activeIndex + i) % periods.length;
      const period = periods[currentIndex];
      const isActive = i === 0;
      
      const actualStartDate = toDateOnlyString(nextDate);
      const endDate = new Date(nextDate);
      endDate.setDate(endDate.getDate() + selectionDays - 1);
      const actualEndDate = toDateOnlyString(endDate);
      const daysUntilActual = differenceInDays(nextDate, today);
      
      familyDates.set(period.current_family_group, {
        actualStartDate,
        actualEndDate,
        daysUntilActual
      });
      
      // Next family starts after this one ends
      nextDate = new Date(endDate);
      nextDate.setDate(nextDate.getDate() + 1);
    }
  }

  return periods.map(period => {
    const scheduledStartDate = parseDateOnly(period.selection_start_date);
    const daysUntilScheduled = differenceInDays(scheduledStartDate, today);
    const isCurrentlyActive = currentFamilyGroup === period.current_family_group;
    
    console.log('[getSelectionPeriodDisplayInfo] Processing period:', {
      familyGroup: period.current_family_group,
      currentFamilyGroup,
      isCurrentlyActive,
      scheduledStartDate: period.selection_start_date,
      daysUntilScheduled
    });
    
    let status: 'scheduled' | 'active' | 'completed' = 'scheduled';
    let displayText = '';
    let daysRemaining: number | undefined;
    let actualStartDate: string;
    let actualEndDate: string;
    let daysUntilActual: number;

    // Check if we have calculated dates for this family
    const calculatedDates = familyDates.get(period.current_family_group);
    
    if (isCurrentlyActive) {
      // Active family: their turn started today
      status = 'active';
      daysRemaining = getDaysRemaining ? getDaysRemaining(period.current_family_group) : undefined;
      actualStartDate = calculatedDates!.actualStartDate;
      actualEndDate = calculatedDates!.actualEndDate;
      daysUntilActual = 0;
      
      if (daysUntilScheduled > 0) {
        // Started early
        displayText = `Active Now (Originally scheduled for ${scheduledStartDate.toLocaleDateString()})`;
      } else {
        displayText = 'Active Now';
      }
    } else if (daysUntilScheduled < 0) {
      // Past their original scheduled date = completed
      status = 'completed';
      displayText = `Completed (was scheduled for ${scheduledStartDate.toLocaleDateString()})`;
      actualStartDate = period.selection_start_date;
      actualEndDate = period.selection_end_date;
      daysUntilActual = daysUntilScheduled;
    } else if (calculatedDates) {
      // Future scheduled date with calculated sequential dates
      status = 'scheduled';
      actualStartDate = calculatedDates.actualStartDate;
      actualEndDate = calculatedDates.actualEndDate;
      daysUntilActual = calculatedDates.daysUntilActual;
      displayText = `Scheduled in ${daysUntilActual} day${daysUntilActual === 1 ? '' : 's'}`;
    } else {
      // Fallback for families without calculated dates
      status = 'scheduled';
      actualStartDate = period.selection_start_date;
      actualEndDate = period.selection_end_date;
      daysUntilActual = daysUntilScheduled;
      displayText = `Scheduled in ${daysUntilActual} day${daysUntilActual === 1 ? '' : 's'}`;
    }

    return {
      familyGroup: period.current_family_group,
      status,
      scheduledStartDate: actualStartDate,
      scheduledEndDate: actualEndDate,
      daysUntilScheduled: daysUntilActual,
      isCurrentlyActive,
      displayText,
      daysRemaining
    };
  });
};

/**
 * Filters selection periods to only show upcoming ones (active or future)
 */
export const getUpcomingSelectionPeriodsWithStatus = (
  displayInfo: SelectionPeriodDisplayInfo[]
): SelectionPeriodDisplayInfo[] => {
  return displayInfo.filter(info => info.status === 'active' || info.status === 'scheduled');
};
