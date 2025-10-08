import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { parseDateOnly } from '@/lib/date-utils';

export interface ConflictingReservation {
  id: string;
  start_date: string;
  end_date: string;
  family_group: string;
  property_name?: string;
  status?: string;
}

export interface ConflictCheckResult {
  hasConflicts: boolean;
  conflicts: ConflictingReservation[];
  warnings: string[];
}

export const useReservationConflicts = () => {
  const { organization } = useOrganization();

  // Check for date range overlaps (allowing same-day check-in/check-out at noon)
  const checkDateOverlap = useCallback((
    start1: Date | string, 
    end1: Date | string, 
    start2: Date | string, 
    end2: Date | string
  ): boolean => {
    const startDate1 = new Date(start1);
    const endDate1 = new Date(end1);
    const startDate2 = new Date(start2);
    const endDate2 = new Date(end2);

    // Allow same-day check-out/check-in (noon policy)
    // If one reservation ends on the same day another starts, no conflict
    if (endDate1.toDateString() === startDate2.toDateString() || 
        endDate2.toDateString() === startDate1.toDateString()) {
      return false;
    }

    // Check if ranges overlap: start1 < end2 && end1 > start2
    return startDate1 < endDate2 && endDate1 > startDate2;
  }, []);

  // Detect conflicting reservations for a given date range
  const detectReservationConflicts = useCallback(async (
    startDate: string | Date,
    endDate: string | Date,
    propertyName?: string,
    excludeReservationId?: string
  ): Promise<ConflictCheckResult> => {
    if (!organization?.id) {
      return { hasConflicts: false, conflicts: [], warnings: ['No organization found'] };
    }

    const startDateStr = typeof startDate === 'string' ? startDate : startDate.toISOString().split('T')[0];
    const endDateStr = typeof endDate === 'string' ? endDate : endDate.toISOString().split('T')[0];

    try {
      // Get all reservations that might overlap, then filter with our noon policy
      let query = supabase
        .from('reservations')
        .select('id, start_date, end_date, family_group, property_name, status')
        .eq('organization_id', organization.id)
        .eq('status', 'confirmed'); // Only check confirmed reservations

      // Exclude specific reservation if provided (for editing)
      if (excludeReservationId) {
        query = query.neq('id', excludeReservationId);
      }

      // Filter by property if specified
      if (propertyName) {
        query = query.eq('property_name', propertyName);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error detecting reservation conflicts:', error);
        return { hasConflicts: false, conflicts: [], warnings: ['Error checking for conflicts'] };
      }

      // Filter overlapping reservations using the updated overlap check
      const actualConflicts = (data || []).filter(reservation => 
        checkDateOverlap(startDateStr, endDateStr, reservation.start_date, reservation.end_date)
      );

      const warnings: string[] = [];

      // Add informational messages for same-day transitions (noon policy)
      const sameDay = data?.filter(reservation => {
        const resEndDate = parseDateOnly(reservation.end_date);
        const newStartDate = parseDateOnly(startDateStr);
        const resStartDate = parseDateOnly(reservation.start_date);
        const newEndDate = parseDateOnly(endDateStr);

        // Check for same-day transitions
        return (
          resEndDate.toDateString() === newStartDate.toDateString() ||
          resStartDate.toDateString() === newEndDate.toDateString()
        );
      }) || [];

      sameDay.forEach(reservation => {
        warnings.push(`Same-day transition with ${reservation.family_group} (check-in/out at noon)`);
      });

      return {
        hasConflicts: actualConflicts.length > 0,
        conflicts: actualConflicts,
        warnings
      };
    } catch (error) {
      console.error('Error in detectReservationConflicts:', error);
      return { hasConflicts: false, conflicts: [], warnings: ['Unexpected error checking conflicts'] };
    }
  }, [organization?.id]);

  // Check for property availability
  const checkPropertyAvailability = useCallback(async (
    startDate: string | Date,
    endDate: string | Date,
    propertyName?: string
  ): Promise<{ available: boolean; conflicts: ConflictingReservation[] }> => {
    const conflictResult = await detectReservationConflicts(startDate, endDate, propertyName);
    
    return {
      available: !conflictResult.hasConflicts,
      conflicts: conflictResult.conflicts
    };
  }, [detectReservationConflicts]);

  // Validate reservation dates for conflicts
  const validateReservationDates = useCallback(async (
    startDate: string | Date,
    endDate: string | Date,
    familyGroup: string,
    propertyName?: string,
    excludeReservationId?: string,
    isEditMode: boolean = false,
    adminOverride: boolean = false
  ): Promise<{ isValid: boolean; errors: string[]; warnings: string[] }> => {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Basic date validation
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start >= end) {
      errors.push('Check-out date must be after check-in date');
    }

    // Past date validation - skip if admin override is enabled
    if (!adminOverride) {
      // Compare dates at midnight to avoid time-of-day issues
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const startDateMidnight = new Date(start);
      startDateMidnight.setHours(0, 0, 0, 0);
      const endDateMidnight = new Date(end);
      endDateMidnight.setHours(0, 0, 0, 0);
      
      // If editing an existing reservation, only check that end date is not in the past
      // This allows extending reservations that have already started
      if (isEditMode) {
        if (endDateMidnight < today) {
          errors.push('Check-out date cannot be in the past');
        }
      } else {
        // For new reservations, check that start date is not in the past
        if (startDateMidnight < today) {
          errors.push('Cannot make reservations for past dates');
        }
      }
    }

    // Check for conflicts
    const conflictResult = await detectReservationConflicts(
      startDate, 
      endDate, 
      propertyName, 
      excludeReservationId
    );

    if (conflictResult.hasConflicts) {
      conflictResult.conflicts.forEach(conflict => {
        errors.push(
          `Overlaps with existing ${conflict.family_group} reservation ` +
          `(${conflict.start_date} to ${conflict.end_date})`
        );
      });
    }

    warnings.push(...conflictResult.warnings);

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }, [detectReservationConflicts]);

  // Find alternative dates near the requested range
  const suggestAlternativeDates = useCallback(async (
    preferredStartDate: string | Date,
    preferredEndDate: string | Date,
    propertyName?: string,
    daysToSearch: number = 14
  ): Promise<{ startDate: Date; endDate: Date }[]> => {
    const alternatives: { startDate: Date; endDate: Date }[] = [];
    const start = new Date(preferredStartDate);
    const end = new Date(preferredEndDate);
    const duration = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

    // Search for available periods before and after the preferred dates
    for (let offset = 1; offset <= daysToSearch; offset++) {
      // Try earlier dates
      const earlierStart = new Date(start);
      earlierStart.setDate(earlierStart.getDate() - offset);
      const earlierEnd = new Date(earlierStart);
      earlierEnd.setDate(earlierEnd.getDate() + duration);

      const earlierAvailability = await checkPropertyAvailability(
        earlierStart, 
        earlierEnd, 
        propertyName
      );

      if (earlierAvailability.available) {
        alternatives.push({ startDate: earlierStart, endDate: earlierEnd });
      }

      // Try later dates
      const laterStart = new Date(start);
      laterStart.setDate(laterStart.getDate() + offset);
      const laterEnd = new Date(laterStart);
      laterEnd.setDate(laterEnd.getDate() + duration);

      const laterAvailability = await checkPropertyAvailability(
        laterStart, 
        laterEnd, 
        propertyName
      );

      if (laterAvailability.available) {
        alternatives.push({ startDate: laterStart, endDate: laterEnd });
      }

      // Stop after finding a few good alternatives
      if (alternatives.length >= 5) break;
    }

    return alternatives;
  }, [checkPropertyAvailability]);

  return {
    detectReservationConflicts,
    checkPropertyAvailability,
    validateReservationDates,
    suggestAlternativeDates,
    checkDateOverlap
  };
};