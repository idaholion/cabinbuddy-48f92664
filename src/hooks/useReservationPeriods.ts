import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from './useOrganization';
import { useRotationOrder } from './useRotationOrder';
import { useToast } from './use-toast';

interface ReservationPeriod {
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

export const useReservationPeriods = () => {
  const [periods, setPeriods] = useState<ReservationPeriod[]>([]);
  const [loading, setLoading] = useState(false);
  const { organization } = useOrganization();
  const { rotationData, calculateRotationForYear } = useRotationOrder();
  const { toast } = useToast();

  // Generate reservation periods for a given selection year
  const generateReservationPeriods = async (selectionYear: number) => {
    if (!organization?.id || !rotationData) {
      console.error('Missing organization or rotation data');
      return;
    }

    setLoading(true);
    try {
      // The key insight: selections starting in October of selectionYear are for reservations in selectionYear + 1
      const reservationYear = selectionYear + 1;
      
      // Get the rotation order for the reservation year (not selection year)
      const rotationOrder = calculateRotationForYear(
        rotationData.rotation_order,
        rotationData.rotation_year,
        reservationYear,
        rotationData.first_last_option || 'first'
      );

      console.log(`Generating periods for ${selectionYear} selections (${reservationYear} reservations)`);
      console.log('Rotation order for', reservationYear, ':', rotationOrder);

      const selectionDays = rotationData.selection_days || 14;
      const startMonth = rotationData.start_month || 'October';
      
      // Convert start month to number (0-based)
      const monthMap: { [key: string]: number } = {
        'January': 0, 'February': 1, 'March': 2, 'April': 3,
        'May': 4, 'June': 5, 'July': 6, 'August': 7,
        'September': 8, 'October': 9, 'November': 10, 'December': 11
      };
      const startMonthNum = monthMap[startMonth] || 9; // Default to October

      // Start date is October 1st of the selection year
      let currentStartDate = new Date(selectionYear, startMonthNum, 1);

      const periodsToInsert = [];

      for (let i = 0; i < rotationOrder.length; i++) {
        const familyGroup = rotationOrder[i];
        const endDate = new Date(currentStartDate);
        endDate.setDate(endDate.getDate() + selectionDays - 1); // 14 days total

        periodsToInsert.push({
          organization_id: organization.id,
          rotation_year: reservationYear, // Store the reservation year, not selection year
          current_family_group: familyGroup,
          current_group_index: i,
          selection_start_date: currentStartDate.toISOString().split('T')[0],
          selection_end_date: endDate.toISOString().split('T')[0],
          reservations_completed: false
        });

        // Move to next period (next day after current period ends)
        currentStartDate = new Date(endDate);
        currentStartDate.setDate(currentStartDate.getDate() + 1);
      }

      // Check if periods already exist for this organization and year
      const { data: existingPeriods } = await supabase
        .from('reservation_periods')
        .select('id')
        .eq('organization_id', organization.id)
        .eq('rotation_year', reservationYear)
        .limit(1);

      // Only insert if no periods exist yet
      if (existingPeriods && existingPeriods.length > 0) {
        console.log('Periods already exist for', reservationYear);
        await fetchReservationPeriods();
        return;
      }

      // Insert the periods into the database
      const { data, error } = await supabase
        .from('reservation_periods')
        .insert(periodsToInsert)
        .select();

      if (error) {
        console.error('Error inserting reservation periods:', error);
        toast({
          title: "Error",
          description: "Failed to generate reservation periods",
          variant: "destructive",
        });
        return;
      }

      console.log('Generated reservation periods:', data);
      toast({
        title: "Success",
        description: `Generated ${periodsToInsert.length} reservation periods for ${reservationYear}`,
      });

      // Refresh the periods
      await fetchReservationPeriods();
    } catch (error) {
      console.error('Error in generateReservationPeriods:', error);
      toast({
        title: "Error",
        description: "Failed to generate reservation periods",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch existing reservation periods
  const fetchReservationPeriods = async () => {
    if (!organization?.id) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('reservation_periods')
        .select('*')
        .eq('organization_id', organization.id)
        .order('selection_start_date');

      if (error) {
        console.error('Error fetching reservation periods:', error);
        return;
      }

      setPeriods(data || []);
    } catch (error) {
      console.error('Error in fetchReservationPeriods:', error);
    } finally {
      setLoading(false);
    }
  };

  // Utility function to parse date strings without timezone conversion
  const parseLocalDate = (dateStr: string): Date => {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day); // month - 1 because JS months are 0-indexed
  };

  // Get upcoming selection periods (within next 30 days OR currently active)
  const getUpcomingSelectionPeriods = (currentFamilyGroup?: string) => {
    const now = new Date();
    now.setHours(0, 0, 0, 0); // Reset to start of day for accurate comparison
    const thirtyDaysFromNow = new Date(now);
    thirtyDaysFromNow.setDate(now.getDate() + 30);

    const upcoming = periods.filter(period => {
      // Always include the currently active family's period
      if (currentFamilyGroup && period.current_family_group === currentFamilyGroup) {
        return true;
      }
      
      // Use local date parsing to avoid timezone issues
      const startDate = parseLocalDate(period.selection_start_date);
      startDate.setHours(0, 0, 0, 0);
      
      return startDate >= now && startDate <= thirtyDaysFromNow;
    });

    return upcoming;
  };

  useEffect(() => {
    if (organization?.id) {
      fetchReservationPeriods();
    }
  }, [organization?.id]);

  // Auto-generate periods for 2026 if none exist and rotation data is available
  useEffect(() => {
    if (organization?.id && rotationData && periods.length === 0 && !loading) {
      // Only generate once - add a flag to prevent repeated attempts
      const hasAttemptedGeneration = sessionStorage.getItem(`periods-generated-${organization.id}`);
      if (!hasAttemptedGeneration) {
        console.log('No reservation periods found, generating for 2025 selections (2026 reservations)');
        sessionStorage.setItem(`periods-generated-${organization.id}`, 'true');
        generateReservationPeriods(2025);
      }
    }
  }, [organization?.id, rotationData, periods.length, loading]);

  return {
    periods,
    loading,
    generateReservationPeriods,
    fetchReservationPeriods,
    getUpcomingSelectionPeriods,
  };
};