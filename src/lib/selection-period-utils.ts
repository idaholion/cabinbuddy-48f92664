import { differenceInDays, parseISO } from 'date-fns';

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
  getDaysRemaining?: (familyGroup: string) => number
): SelectionPeriodDisplayInfo[] => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return periods.map(period => {
    const scheduledStartDate = parseISO(period.selection_start_date);
    const daysUntilScheduled = differenceInDays(scheduledStartDate, today);
    const isCurrentlyActive = currentFamilyGroup === period.current_family_group;
    
    let status: 'scheduled' | 'active' | 'completed' = 'scheduled';
    let displayText = '';
    let daysRemaining: number | undefined;

    if (isCurrentlyActive) {
      status = 'active';
      daysRemaining = getDaysRemaining ? getDaysRemaining(period.current_family_group) : undefined;
      
      if (daysUntilScheduled > 0) {
        // Started early
        displayText = `Active Now (Originally scheduled for ${scheduledStartDate.toLocaleDateString()})`;
      } else if (daysUntilScheduled === 0) {
        // Started on time
        displayText = 'Active Now';
      } else {
        // Started late (shouldn't happen but handle it)
        displayText = 'Active Now';
      }
    } else if (daysUntilScheduled < 0) {
      // Past scheduled date and not active = completed
      status = 'completed';
      displayText = `Completed (was scheduled for ${scheduledStartDate.toLocaleDateString()})`;
    } else {
      // Future scheduled date
      status = 'scheduled';
      displayText = `Scheduled in ${daysUntilScheduled} day${daysUntilScheduled === 1 ? '' : 's'}`;
    }

    return {
      familyGroup: period.current_family_group,
      status,
      scheduledStartDate: period.selection_start_date,
      scheduledEndDate: period.selection_end_date,
      daysUntilScheduled,
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
