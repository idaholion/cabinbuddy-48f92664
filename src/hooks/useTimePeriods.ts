import { useState, useEffect } from 'react';
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
}

export const useTimePeriods = () => {
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
    
    // Don't generate time periods for years too far in the past or future
    if (Math.abs(monthYear - currentYear) > 1) {
      return [];
    }
    
    // Only generate if we're looking at the rotation year or current year
    if (monthYear !== rotationData.rotation_year && monthYear !== currentYear) {
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

      // Create time period window
      const windowStart = new Date(currentDate);
      const windowEnd = new Date(currentDate);
      windowEnd.setDate(windowEnd.getDate() + maxNights - 1); // Subtract 1 to make it inclusive

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
    timePeriodWindows: TimePeriodWindow[]
  ): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];

    // Find the relevant time period window
    const relevantWindow = timePeriodWindows.find(window => 
      window.familyGroup === familyGroup &&
      startDate >= window.startDate &&
      endDate <= window.endDate
    );

    if (!relevantWindow) {
      errors.push('Booking dates must fall within your assigned time period window');
      return { isValid: false, errors };
    }

    // Validate start day constraint
    if (!rotationData) {
      errors.push('Rotation settings not found');
      return { isValid: false, errors };
    }

    const dayMap: { [key: string]: number } = {
      'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3,
      'Thursday': 4, 'Friday': 5, 'Saturday': 6
    };
    const requiredStartDay = dayMap[rotationData.start_day || 'Friday'];
    
    // Allow booking to start on or after the required start day within the window
    if (startDate < relevantWindow.startDate) {
      errors.push(`Booking cannot start before ${relevantWindow.startDate.toDateString()}`);
    }

    // Calculate nights
    const nights = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    if (nights > rotationData.max_nights!) {
      errors.push(`Booking cannot exceed ${rotationData.max_nights} nights`);
    }

    if (nights < 1) {
      errors.push('Booking must be at least 1 night');
    }

    // Check if family group has available time periods
    const usage = timePeriodUsage.find(u => u.family_group === familyGroup);
    if (usage && usage.time_periods_used >= usage.time_periods_allowed) {
      errors.push('Your family group has already used all allocated time periods');
    }

    return { isValid: errors.length === 0, errors };
  };

  // Fetch time period usage for current year
  const fetchTimePeriodUsage = async (year?: number) => {
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

      const processedData = (data || []).map(item => ({
        family_group: item.family_group,
        time_periods_used: item.time_periods_used,
        time_periods_allowed: item.time_periods_allowed,
        secondary_periods_used: item.secondary_periods_used || 0,
        secondary_periods_allowed: item.secondary_periods_allowed || 1,
        selection_round: item.selection_round || 'primary',
        last_selection_date: item.last_selection_date ? new Date(item.last_selection_date) : undefined,
        selection_deadline: item.selection_deadline ? new Date(item.selection_deadline) : undefined
      }));
      setTimePeriodUsage(processedData);
    } catch (error) {
      console.error('Error in fetchTimePeriodUsage:', error);
    } finally {
      setLoading(false);
    }
  };

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

  useEffect(() => {
    if (organization?.id && rotationData) {
      fetchTimePeriodUsage();
    }
  }, [organization?.id, rotationData]);

  return {
    timePeriodUsage,
    loading,
    calculateTimePeriodWindows,
    validateBooking,
    fetchTimePeriodUsage,
    initializeTimePeriodUsage,
    updateTimePeriodUsage,
  };
};