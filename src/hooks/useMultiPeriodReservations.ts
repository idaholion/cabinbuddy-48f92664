import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useOrganization } from '@/hooks/useOrganization';
import { useTimePeriods } from '@/hooks/useTimePeriods';

export interface MultiPeriodReservationData {
  periods: {
    startDate: Date;
    endDate: Date;
    periodNumber: number;
    nights: number;
  }[];
  familyGroup: string;
  guestCount: number;
  totalCost?: number;
  propertyName?: string;
}

export interface TimePeriodAllocation {
  periodNumber: number;
  startDate: Date;
  endDate: Date;
  availableNights: number;
  allocatedNights: number;
  remainingNights: number;
  familyGroup: string;
}

export const useMultiPeriodReservations = () => {
  const { user } = useAuth();
  const { organization } = useOrganization();
  const { toast } = useToast();
  const { updateTimePeriodUsage, timePeriodUsage } = useTimePeriods();
  const [loading, setLoading] = useState(false);

  // Calculate available allocations across multiple periods for a family group
  const calculateAvailableAllocations = (
    familyGroup: string,
    year: number,
    timePeriodWindows: any[]
  ): TimePeriodAllocation[] => {
    const familyWindows = timePeriodWindows.filter(w => w.familyGroup === familyGroup);
    const usage = timePeriodUsage.find(u => u.family_group === familyGroup);
    
    return familyWindows.map(window => ({
      periodNumber: window.periodNumber,
      startDate: window.startDate,
      endDate: window.endDate,
      availableNights: window.maxNights,
      allocatedNights: 0, // Will be calculated from existing reservations
      remainingNights: window.maxNights,
      familyGroup: window.familyGroup
    }));
  };

  // Validate multi-period reservation
  const validateMultiPeriodReservation = (
    reservationData: MultiPeriodReservationData,
    timePeriodWindows: any[]
  ): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];
    const { periods, familyGroup } = reservationData;

    // Check family group usage limits
    const usage = timePeriodUsage.find(u => u.family_group === familyGroup);
    const periodsToUse = periods.length;
    const remainingPeriods = usage ? 
      Math.max(0, usage.time_periods_allowed - usage.time_periods_used) : 
      2; // Default max

    if (periodsToUse > remainingPeriods) {
      errors.push(`Cannot book ${periodsToUse} periods. Only ${remainingPeriods} remaining for ${familyGroup}`);
    }

    // Validate each period
    periods.forEach((period, index) => {
      const relevantWindow = timePeriodWindows.find(window =>
        window.familyGroup === familyGroup &&
        window.periodNumber === period.periodNumber
      );

      if (!relevantWindow) {
        errors.push(`Period ${index + 1}: No time window found for ${familyGroup} in period ${period.periodNumber}`);
        return;
      }

      // Check if dates fall within the allocated window
      if (period.startDate < relevantWindow.startDate || period.endDate > relevantWindow.endDate) {
        errors.push(`Period ${index + 1}: Dates must fall within allocated window (${relevantWindow.startDate.toDateString()} - ${relevantWindow.endDate.toDateString()})`);
      }

      // Check nights limit
      if (period.nights > relevantWindow.maxNights) {
        errors.push(`Period ${index + 1}: Cannot exceed ${relevantWindow.maxNights} nights per period`);
      }

      // Check minimum nights
      if (period.nights < 1) {
        errors.push(`Period ${index + 1}: Must book at least 1 night`);
      }
    });

    return { isValid: errors.length === 0, errors };
  };

  // Create multi-period reservation
  const createMultiPeriodReservation = async (
    reservationData: MultiPeriodReservationData
  ) => {
    if (!user || !organization?.id) {
      toast({
        title: "Error",
        description: "You must be logged in and have an organization to create reservations.",
        variant: "destructive",
      });
      return null;
    }

    setLoading(true);
    try {
      const reservations = [];
      
      // Create individual reservations for each period
      for (const period of reservationData.periods) {
        const reservationToCreate = {
          start_date: period.startDate.toISOString().split('T')[0],
          end_date: period.endDate.toISOString().split('T')[0],
          family_group: reservationData.familyGroup,
          guest_count: reservationData.guestCount,
          total_cost: reservationData.totalCost ? 
            (reservationData.totalCost * period.nights) / reservationData.periods.reduce((sum, p) => sum + p.nights, 0) : 
            undefined,
          property_name: reservationData.propertyName,
          time_period_number: period.periodNumber,
          nights_used: period.nights,
          allocated_start_date: period.startDate.toISOString().split('T')[0],
          allocated_end_date: period.endDate.toISOString().split('T')[0],
          organization_id: organization.id,
          user_id: user.id,
          status: 'confirmed'
        };

        const { data: newReservation, error } = await supabase
          .from('reservations')
          .insert(reservationToCreate)
          .select()
          .single();

        if (error) {
          throw error;
        }

        reservations.push(newReservation);

        // Update usage for each period used
        await updateTimePeriodUsage(reservationData.familyGroup, period.startDate.getFullYear());
      }

      toast({
        title: "Multi-Period Booking Confirmed",
        description: `Successfully booked ${reservationData.periods.length} periods for ${reservationData.familyGroup}`,
      });

      return reservations;
    } catch (error) {
      console.error('Error creating multi-period reservation:', error);
      toast({
        title: "Booking Failed",
        description: "Failed to create multi-period reservation. Please try again.",
        variant: "destructive",
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Split existing reservation across multiple periods
  const splitReservation = async (
    originalReservationId: string,
    newPeriods: MultiPeriodReservationData['periods']
  ) => {
    if (!user || !organization?.id) {
      toast({
        title: "Error",
        description: "You must be logged in to split reservations.",
        variant: "destructive",
      });
      return null;
    }

    setLoading(true);
    try {
      // Get original reservation
      const { data: originalReservation, error: fetchError } = await supabase
        .from('reservations')
        .select('*')
        .eq('id', originalReservationId)
        .eq('organization_id', organization.id)
        .single();

      if (fetchError || !originalReservation) {
        throw new Error('Original reservation not found');
      }

      // Delete original reservation
      const { error: deleteError } = await supabase
        .from('reservations')
        .delete()
        .eq('id', originalReservationId)
        .eq('organization_id', organization.id);

      if (deleteError) {
        throw deleteError;
      }

      // Create new reservations for each period
      const newReservations = [];
      const totalNights = newPeriods.reduce((sum, period) => sum + period.nights, 0);

      for (const period of newPeriods) {
        const proportionalCost = originalReservation.total_cost ? 
          (originalReservation.total_cost * period.nights) / totalNights : 
          null;

        const newReservation = {
          start_date: period.startDate.toISOString().split('T')[0],
          end_date: period.endDate.toISOString().split('T')[0],
          family_group: originalReservation.family_group,
          guest_count: originalReservation.guest_count,
          total_cost: proportionalCost,
          property_name: originalReservation.property_name,
          time_period_number: period.periodNumber,
          nights_used: period.nights,
          allocated_start_date: period.startDate.toISOString().split('T')[0],
          allocated_end_date: period.endDate.toISOString().split('T')[0],
          organization_id: organization.id,
          user_id: user.id,
          status: originalReservation.status
        };

        const { data: createdReservation, error: createError } = await supabase
          .from('reservations')
          .insert(newReservation)
          .select()
          .single();

        if (createError) {
          throw createError;
        }

        newReservations.push(createdReservation);
      }

      toast({
        title: "Reservation Split Successfully",
        description: `Reservation split into ${newPeriods.length} periods`,
      });

      return newReservations;
    } catch (error) {
      console.error('Error splitting reservation:', error);
      toast({
        title: "Split Failed",
        description: "Failed to split reservation. Please try again.",
        variant: "destructive",
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Get usage summary for a family group across all periods
  const getFamilyGroupUsageSummary = (familyGroup: string, year: number) => {
    const usage = timePeriodUsage.find(u => u.family_group === familyGroup);
    
    if (!usage) {
      return {
        periodsUsed: 0,
        periodsAllowed: 2, // Default
        periodsRemaining: 2,
        canBookMorePeriods: true
      };
    }

    return {
      periodsUsed: usage.time_periods_used,
      periodsAllowed: usage.time_periods_allowed,
      periodsRemaining: Math.max(0, usage.time_periods_allowed - usage.time_periods_used),
      canBookMorePeriods: usage.time_periods_used < usage.time_periods_allowed
    };
  };

  return {
    loading,
    calculateAvailableAllocations,
    validateMultiPeriodReservation,
    createMultiPeriodReservation,
    splitReservation,
    getFamilyGroupUsageSummary,
  };
};