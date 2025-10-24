import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useOrganization } from '@/hooks/useOrganization';
import { useRotationOrder } from '@/hooks/useRotationOrder';

interface TimePeriodWindow {
  startDate: Date;
  endDate: Date;
  start_date: Date;
  end_date: Date;
  periodNumber: number;
  period_number: number;
  familyGroup: string;
  family_group: string;
  maxNights: number;
  isAvailable: boolean;
  available: boolean;
  isCurrentTurn: boolean;
}

interface TimePeriodUsageData {
  family_group: string;
  time_periods_used: number;
  time_periods_allowed: number;
  secondary_periods_used?: number;
  secondary_periods_allowed?: number;
  selection_round?: string;
  last_selection_date?: Date;
  selection_deadline?: Date;
  turn_completed?: boolean;
}

export const useTimePeriods = (rotationYear?: number) => {
  const { user } = useAuth();
  const { organization } = useOrganization();
  const { rotationData, getRotationForYear } = useRotationOrder();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [timePeriodUsage, setTimePeriodUsage] = useState<TimePeriodUsageData[]>([]);

  // Calculate time period windows based on rotation settings
  const calculateTimePeriodWindows = (
    year: number,
    month: Date
  ): TimePeriodWindow[] => {
    if (!rotationData) return [];

    // Only generate time periods for the current rotation year or within 1 year range
    const currentYear = new Date().getFullYear();
    const monthYear = month.getFullYear();
    
    // Allow booking for current year and up to 2 years in the future
    // This supports advance planning while preventing unreasonable future dates
    if (monthYear < currentYear || monthYear > currentYear + 2) {
      return [];
    }

    const windows: TimePeriodWindow[] = [];
    const rotationOrder = getRotationForYear(monthYear);
    const maxTimeSlots = rotationData.max_time_slots || 2;
    const maxNights = rotationData.max_nights || 7;
    const startDay = rotationData.start_day || 'Friday';
    
    // Get the day of week index (0 = Sunday, 1 = Monday, etc.)
    const dayMap: { [key: string]: number } = {
      'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3,
      'Thursday': 4, 'Friday': 5, 'Saturday': 6
    };
    const startDayIndex = dayMap[startDay] ?? 5;

    // Calculate time period windows only for the specific month being viewed
    const startOfMonth = new Date(month.getFullYear(), month.getMonth(), 1);
    const endOfMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0);
    
    let currentDate = new Date(startOfMonth);
    let periodNumber = 1;
    let currentGroupIndex = 0;

    while (currentDate <= endOfMonth) {
      // Find the next occurrence of the start day
      while (currentDate.getDay() !== startDayIndex && currentDate <= endOfMonth) {
        currentDate.setDate(currentDate.getDate() + 1);
      }

      if (currentDate > endOfMonth) break;

      // Create time period window (Friday noon to Friday noon = 7 days for 7 nights)
      const windowStart = new Date(currentDate);
      windowStart.setHours(12, 0, 0, 0); // Set to noon
      const windowEnd = new Date(currentDate);
      windowEnd.setDate(windowEnd.getDate() + maxNights); // For 7-night stays, this is 7 days later
      windowEnd.setHours(12, 0, 0, 0); // Set to noon

      const currentFamilyGroup = rotationOrder[currentGroupIndex % rotationOrder.length];
      
      windows.push({
        startDate: windowStart,
        endDate: windowEnd,
        start_date: windowStart,
        end_date: windowEnd,
        periodNumber,
        period_number: periodNumber,
        familyGroup: currentFamilyGroup,
        family_group: currentFamilyGroup,
        maxNights,
        isAvailable: true,
        available: true,
        isCurrentTurn: false
      });

      // Move to next time period (add maxNights to get to next period)
      currentDate.setDate(currentDate.getDate() + maxNights);
      periodNumber++;
      currentGroupIndex++;
    }

    return windows;
  };

  // Validate booking dates against time period rules
  const validateBooking = (
    startDate: Date,
    endDate: Date,
    familyGroup: string,
    timePeriodWindows: TimePeriodWindow[],
    adminOverride: boolean = false
  ): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];

    if (!rotationData) {
      errors.push('Rotation settings not found');
      return { isValid: false, errors };
    }

    // Check if all selection phases are active
    const allPhasesActive = rotationData.enable_secondary_selection && rotationData.enable_post_rotation_selection;

    // Normalize dates to noon for comparison with noon-based windows
    const normalizedStartDate = new Date(startDate);
    normalizedStartDate.setHours(12, 0, 0, 0);
    const normalizedEndDate = new Date(endDate);
    normalizedEndDate.setHours(12, 0, 0, 0);

    console.log('[useTimePeriods] validateBooking called:', {
      familyGroup,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      normalizedStartDate: normalizedStartDate.toISOString(),
      normalizedEndDate: normalizedEndDate.toISOString(),
      allPhasesActive,
      adminOverride,
      windowCount: timePeriodWindows.length
    });

    // Find the relevant time period window
    // When all phases are active, allow booking any available window, not just the family's assigned window
    const relevantWindow = timePeriodWindows.find(window => {
      const windowStart = new Date(window.startDate);
      const windowEnd = new Date(window.endDate);
      
      console.log('[useTimePeriods] Checking window:', {
        windowFamilyGroup: window.familyGroup,
        windowStart: windowStart.toISOString(),
        windowEnd: windowEnd.toISOString(),
        startMatch: normalizedStartDate >= windowStart,
        endMatch: normalizedEndDate <= windowEnd
      });
      
      const datesMatch = normalizedStartDate >= windowStart && normalizedEndDate <= windowEnd;
      
      // If all phases active, only check dates. Otherwise, also check family group assignment
      if (allPhasesActive || adminOverride) {
        return datesMatch;
      }
      
      return window.familyGroup === familyGroup && datesMatch;
    });
    
    console.log('[useTimePeriods] Relevant window found:', relevantWindow ? {
      familyGroup: relevantWindow.familyGroup,
      startDate: new Date(relevantWindow.startDate).toISOString(),
      endDate: new Date(relevantWindow.endDate).toISOString()
    } : null);

    if (!relevantWindow) {
      if (allPhasesActive || adminOverride) {
        errors.push('Booking dates must fall within a valid time period window');
      } else {
        errors.push('Booking dates must fall within your assigned time period window');
      }
      return { isValid: false, errors };
    }

    // Allow booking to start on or after the required start day within the window
    if (startDate < relevantWindow.startDate) {
      errors.push(`Booking cannot start before ${relevantWindow.startDate.toDateString()}`);
    }

    // Calculate nights
    const nights = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // Determine which selection phase we're in
    const usage = timePeriodUsage.find(u => u.family_group === familyGroup);
    const isPostRotation = allPhasesActive || (rotationData.enable_post_rotation_selection && 
      usage && usage.time_periods_used >= usage.time_periods_allowed);
    const isSecondaryPhase = !isPostRotation && rotationData.enable_secondary_selection && 
      usage && usage.selection_round === 'secondary';
    
    // Determine min/max nights based on phase
    let minNights = rotationData.min_nights_per_booking || 2;
    let maxConsecutive: number;
    
    if (isPostRotation) {
      minNights = rotationData.post_rotation_min_nights || 2;
      maxConsecutive = rotationData.post_rotation_max_consecutive_nights || 14;
    } else if (isSecondaryPhase) {
      maxConsecutive = rotationData.max_consecutive_nights_secondary || 7;
    } else {
      maxConsecutive = rotationData.max_consecutive_nights_primary || 14;
    }
    
    if (nights < minNights && !adminOverride) {
      errors.push(`Booking must be at least ${minNights} nights`);
    }
    
    if (nights > maxConsecutive && !adminOverride) {
      const phaseName = isPostRotation ? 'post-rotation' : isSecondaryPhase ? 'secondary' : 'primary';
      errors.push(`Single booking cannot exceed ${maxConsecutive} consecutive nights during ${phaseName} selection`);
    }
    
    // Enforce total nights budget for primary selection
    if (!isPostRotation && !isSecondaryPhase && !adminOverride) {
      const totalNightsLimit = rotationData.total_nights_allowed_primary || 14;
      if (usage) {
        // TODO: Calculate total nights already used from existing reservations
        // For now, we'll just validate the single booking doesn't exceed the limit
        if (nights > totalNightsLimit) {
          errors.push(`Cannot book more than ${totalNightsLimit} total nights during primary selection`);
        }
      }
    }

    // Check if family group has available time periods
    // Skip this check if admin override is enabled OR if all selection phases are active
    
    if (!adminOverride && !allPhasesActive) {
      const usage = timePeriodUsage.find(u => u.family_group === familyGroup);
      if (usage && usage.time_periods_used >= usage.time_periods_allowed) {
        errors.push('This family group has already used all allocated time periods for this year');
      }
    }

    return { isValid: errors.length === 0, errors };
  };

  // Fetch time period usage for current year
  const fetchTimePeriodUsage = useCallback(async (year?: number) => {
    if (!user || !organization?.id) return;

    const currentYear = year || new Date().getFullYear();
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('time_period_usage')
        .select('*')
        .eq('organization_id', organization.id)
        .eq('rotation_year', currentYear);

      if (error) {
        console.error('Error fetching time period usage:', error);
        return;
      }

      console.log('[DEBUG] useTimePeriods - Fetched raw usage data:', {
        currentYear,
        organizationId: organization.id,
        rawData: data
      });

      const processedData = (data || []).map(item => ({
        family_group: item.family_group,
        time_periods_used: item.time_periods_used,
        time_periods_allowed: item.time_periods_allowed,
        secondary_periods_used: item.secondary_periods_used || 0,
        secondary_periods_allowed: item.secondary_periods_allowed || 1,
        selection_round: item.selection_round || 'primary',
        turn_completed: item.turn_completed || false,
        last_selection_date: item.last_selection_date ? (() => {
          const date = new Date(item.last_selection_date);
          return isNaN(date.getTime()) ? undefined : date;
        })() : undefined,
        selection_deadline: item.selection_deadline ? (() => {
          const date = new Date(item.selection_deadline);
          return isNaN(date.getTime()) ? undefined : date;
        })() : undefined
      }));
      
      console.log('[DEBUG] useTimePeriods - Processed usage data:', processedData);
      setTimePeriodUsage(processedData);
    } catch (error) {
      console.error('Error in fetchTimePeriodUsage:', error);
    } finally {
      setLoading(false);
    }
  }, [user, organization?.id]);

  // Initialize time period usage for family groups
  const initializeTimePeriodUsage = async (year: number, familyGroups: string[]) => {
    if (!organization?.id || !rotationData) return;

    try {
      const existingUsage = await supabase
        .from('time_period_usage')
        .select('family_group')
        .eq('organization_id', organization.id)
        .eq('rotation_year', year);

      const existingGroups = existingUsage.data?.map(u => u.family_group) || [];
      const newGroups = familyGroups.filter(group => !existingGroups.includes(group));

      if (newGroups.length > 0) {
        const insertData = newGroups.map(group => ({
          organization_id: organization.id,
          family_group: group,
          rotation_year: year,
          time_periods_used: 0,
          time_periods_allowed: rotationData.max_time_slots || 2
        }));

        const { error } = await supabase
          .from('time_period_usage')
          .insert(insertData);

        if (error) {
          console.error('Error initializing time period usage:', error);
        } else {
          await fetchTimePeriodUsage(year);
        }
      }
    } catch (error) {
      console.error('Error in initializeTimePeriodUsage:', error);
    }
  };

  // Update time period usage when a booking is made
  const updateTimePeriodUsage = async (familyGroup: string, year: number) => {
    if (!organization?.id) return;

    try {
      const { data: currentUsage, error: fetchError } = await supabase
        .from('time_period_usage')
        .select('*')
        .eq('organization_id', organization.id)
        .eq('family_group', familyGroup)
        .eq('rotation_year', year)
        .maybeSingle(); // Use maybeSingle instead of single

      if (fetchError) {
        console.error('Error fetching current usage:', fetchError);
        return;
      }

      // If no usage record exists, create one
      if (!currentUsage) {
        const { error: insertError } = await supabase
          .from('time_period_usage')
          .insert({
            organization_id: organization.id,
            family_group: familyGroup,
            rotation_year: year,
            time_periods_used: 1,
            time_periods_allowed: rotationData?.max_time_slots || 2,
            last_selection_date: new Date().toISOString()
          });

        if (insertError) {
          console.error('Error creating time period usage:', insertError);
          toast({
            title: "Warning",
            description: "Booking created but usage tracking failed",
            variant: "destructive",
          });
        }
      } else {
        const { error: updateError } = await supabase
          .from('time_period_usage')
          .update({
            time_periods_used: currentUsage.time_periods_used + 1,
            last_selection_date: new Date().toISOString()
          })
          .eq('id', currentUsage.id);

        if (updateError) {
          console.error('Error updating time period usage:', updateError);
          toast({
            title: "Warning",
            description: "Booking created but usage tracking failed",
            variant: "destructive",
          });
        }
      }
      
      await fetchTimePeriodUsage(year);
    } catch (error) {
      console.error('Error in updateTimePeriodUsage:', error);
    }
  };

  // Reconcile usage data with actual reservations
  const [hasReconciled, setHasReconciled] = useState<Record<number, boolean>>({});

  const reconcileUsageData = useCallback(async (year: number) => {
    if (!organization?.id || !rotationData) return;

    console.log(`[Reconciliation] Starting reconciliation for year ${year}`);

    try {
      // Fetch all reservations for this year
      const { data: reservations, error: resError } = await supabase
        .from('reservations')
        .select('family_group, start_date, end_date')
        .eq('organization_id', organization.id)
        .gte('start_date', `${year}-01-01`)
        .lt('start_date', `${year + 1}-01-01`);

      if (resError || !reservations) {
        console.error('Error fetching reservations for reconciliation:', resError);
        return;
      }

      // Count time periods per family (Friday-to-Friday is 1 period)
      const familyCounts: Record<string, number> = {};
      reservations.forEach(res => {
        if (!familyCounts[res.family_group]) {
          familyCounts[res.family_group] = 0;
        }
        // Count Friday-to-Friday periods (7-day periods)
        const start = new Date(res.start_date);
        const end = new Date(res.end_date);
        const days = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        const periods = Math.floor(days / 7);
        familyCounts[res.family_group] += periods;
      });

      // Update or create usage records to match actual reservations
      for (const [familyGroup, actualCount] of Object.entries(familyCounts)) {
        const { data: existing, error: fetchError } = await supabase
          .from('time_period_usage')
          .select('*')
          .eq('organization_id', organization.id)
          .eq('family_group', familyGroup)
          .eq('rotation_year', year)
          .maybeSingle();

        if (fetchError) {
          console.error('Error checking usage for', familyGroup, fetchError);
          continue;
        }

        if (!existing) {
          // Create new record
          const { error: insertError } = await supabase
            .from('time_period_usage')
            .insert({
              organization_id: organization.id,
              family_group: familyGroup,
              rotation_year: year,
              time_periods_used: actualCount,
              time_periods_allowed: rotationData.max_time_slots || 2,
              last_selection_date: new Date().toISOString()
            });

          if (insertError) {
            console.error('Error creating usage record for', familyGroup, insertError);
          } else {
            console.log(`[Reconciliation] Created usage record for ${familyGroup}: ${actualCount} periods`);
          }
        } else if (existing.time_periods_used !== actualCount) {
          // Update existing record
          const { error: updateError } = await supabase
            .from('time_period_usage')
            .update({
              time_periods_used: actualCount,
              last_selection_date: new Date().toISOString()
            })
            .eq('id', existing.id);

          if (updateError) {
            console.error('Error updating usage for', familyGroup, updateError);
          } else {
            console.log(`[Reconciliation] Updated usage for ${familyGroup}: ${existing.time_periods_used} → ${actualCount}`);
          }
        }
      }

      // Refresh usage data after reconciliation
      await fetchTimePeriodUsage(year);
      console.log(`[Reconciliation] Completed reconciliation for year ${year}`);
    } catch (error) {
      console.error('Error in reconcileUsageData:', error);
    }
  }, [organization?.id, rotationData, fetchTimePeriodUsage]);

  // Force reconciliation without checking hasReconciled flag
  // Use this when you need to immediately recount (e.g., after deletion)
  const forceReconcileUsageData = useCallback(async (year: number) => {
    if (!organization?.id || !rotationData) return;

    console.log(`[Force Reconciliation] Forcing reconciliation for year ${year}`);
    await reconcileUsageData(year);
  }, [organization?.id, rotationData, reconcileUsageData]);

  useEffect(() => {
    if (organization?.id && rotationData) {
      // Use provided rotation year or default to current year
      const yearToFetch = rotationYear || new Date().getFullYear();
      
      // Only reconcile once per year to prevent automatic advancement
      if (!hasReconciled[yearToFetch]) {
        console.log(`[Reconciliation] First load for year ${yearToFetch}, fetching and reconciling`);
        
        // First fetch existing usage data
        fetchTimePeriodUsage(yearToFetch).then(() => {
          // Then reconcile with actual reservations (only once)
          reconcileUsageData(yearToFetch).then(() => {
            setHasReconciled(prev => ({ ...prev, [yearToFetch]: true }));
          });
        });
      } else {
        console.log(`[Reconciliation] Already reconciled for year ${yearToFetch}, only fetching usage`);
        // Just fetch usage data without reconciling to avoid triggering state changes
        fetchTimePeriodUsage(yearToFetch);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organization?.id, rotationData, rotationYear]);

  return {
    timePeriodUsage,
    loading,
    calculateTimePeriodWindows,
    validateBooking,
    fetchTimePeriodUsage,
    initializeTimePeriodUsage,
    updateTimePeriodUsage,
    forceReconcileUsageData,
  };
};