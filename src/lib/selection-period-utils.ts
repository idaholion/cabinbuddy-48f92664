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

  // Track the cumulative start date for scheduled families
  let nextScheduledStartDate = new Date(today);

  return periods.map((period, index) => {
    const scheduledStartDate = parseDateOnly(period.selection_start_date);
    const daysUntilScheduled = differenceInDays(scheduledStartDate, today);
    const isCurrentlyActive = currentFamilyGroup === period.current_family_group;
    
    console.log('[getSelectionPeriodDisplayInfo] Processing period:', {
      familyGroup: period.current_family_group,
      currentFamilyGroup,
      isCurrentlyActive,
      scheduledStartDate: period.selection_start_date,
      daysUntilScheduled,
      index,
      activeIndex
    });
    
    let status: 'scheduled' | 'active' | 'completed' = 'scheduled';
    let displayText = '';
    let daysRemaining: number | undefined;
    let actualStartDate: string;
    let actualEndDate: string;
    let daysUntilActual: number;

    if (isCurrentlyActive) {
      // Active family: their turn started today
      status = 'active';
      daysRemaining = getDaysRemaining ? getDaysRemaining(period.current_family_group) : undefined;
      actualStartDate = toDateOnlyString(today);
      const endDate = new Date(today);
      endDate.setDate(endDate.getDate() + selectionDays - 1);
      actualEndDate = toDateOnlyString(endDate);
      daysUntilActual = 0;
      
      if (daysUntilScheduled > 0) {
        // Started early
        displayText = `Active Now (Originally scheduled for ${scheduledStartDate.toLocaleDateString()})`;
      } else {
        displayText = 'Active Now';
      }
      
      // Next scheduled family starts after this one ends
      nextScheduledStartDate = new Date(endDate);
      nextScheduledStartDate.setDate(nextScheduledStartDate.getDate() + 1);
    } else if (daysUntilScheduled < 0) {
      // Past their original scheduled date = completed
      status = 'completed';
      displayText = `Completed (was scheduled for ${scheduledStartDate.toLocaleDateString()})`;
      actualStartDate = period.selection_start_date;
      actualEndDate = period.selection_end_date;
      daysUntilActual = daysUntilScheduled;
    } else if (activeIndex >= 0 && index > activeIndex) {
      // Families after the active family in the array are scheduled sequentially
      status = 'scheduled';
      daysUntilActual = differenceInDays(nextScheduledStartDate, today);
      actualStartDate = toDateOnlyString(nextScheduledStartDate);
      const endDate = new Date(nextScheduledStartDate);
      endDate.setDate(endDate.getDate() + selectionDays - 1);
      actualEndDate = toDateOnlyString(endDate);
      displayText = `Scheduled in ${daysUntilActual} day${daysUntilActual === 1 ? '' : 's'}`;
      
      // Next scheduled family starts after this one ends
      nextScheduledStartDate = new Date(endDate);
      nextScheduledStartDate.setDate(nextScheduledStartDate.getDate() + 1);
    } else if (activeIndex >= 0 && index < activeIndex && daysUntilScheduled >= 0) {
      // Families before active family but with future scheduled dates go after the active sequence
      status = 'scheduled';
      daysUntilActual = differenceInDays(nextScheduledStartDate, today);
      actualStartDate = toDateOnlyString(nextScheduledStartDate);
      const endDate = new Date(nextScheduledStartDate);
      endDate.setDate(endDate.getDate() + selectionDays - 1);
      actualEndDate = toDateOnlyString(endDate);
      displayText = `Scheduled in ${daysUntilActual} day${daysUntilActual === 1 ? '' : 's'}`;
      
      // Next scheduled family starts after this one ends
      nextScheduledStartDate = new Date(endDate);
      nextScheduledStartDate.setDate(nextScheduledStartDate.getDate() + 1);
    } else {
      // No active family and future scheduled date
      status = 'scheduled';
      daysUntilActual = differenceInDays(nextScheduledStartDate, today);
      actualStartDate = toDateOnlyString(nextScheduledStartDate);
      const endDate = new Date(nextScheduledStartDate);
      endDate.setDate(endDate.getDate() + selectionDays - 1);
      actualEndDate = toDateOnlyString(endDate);
      displayText = `Scheduled in ${daysUntilActual} day${daysUntilActual === 1 ? '' : 's'}`;
      
      // Next scheduled family starts after this one ends
      nextScheduledStartDate = new Date(endDate);
      nextScheduledStartDate.setDate(nextScheduledStartDate.getDate() + 1);
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
