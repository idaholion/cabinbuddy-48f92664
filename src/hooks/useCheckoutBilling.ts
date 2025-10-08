import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { BillingCalculator, BillingConfig } from '@/lib/billing-calculator';
import { useOrganization } from './useOrganization';

interface DailyOccupancyData {
  date: string;
  guests: number;
}

interface CheckoutBillingResult {
  dailyBreakdown: Array<{ date: string; guests: number; cost: number }>;
  billing: {
    baseAmount: number;
    cleaningFee: number;
    petFee: number;
    damageDeposit: number;
    subtotal: number;
    tax: number;
    total: number;
    details: string;
  };
  totalDays: number;
  averageGuests: number;
  loading: boolean;
  createDeferredPayment: () => Promise<boolean>;
}

export const useCheckoutBilling = (
  reservationId: string | undefined,
  checkInDate: Date | null,
  checkOutDate: Date | null,
  reservedGuests: number,
  billingConfig: BillingConfig | null
): CheckoutBillingResult => {
  const [dailyOccupancy, setDailyOccupancy] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const { organization } = useOrganization();
  const { toast } = useToast();

  // Fetch daily check-in data
  useEffect(() => {
    const fetchDailyOccupancy = async () => {
      if (!reservationId || !checkInDate || !checkOutDate) {
        setLoading(false);
        return;
      }

      try {
        const { data: sessions, error } = await supabase
          .from('checkin_sessions')
          .select('check_date, checklist_responses')
          .eq('session_type', 'daily')
          .gte('check_date', checkInDate.toISOString().split('T')[0])
          .lte('check_date', checkOutDate.toISOString().split('T')[0])
          .order('check_date', { ascending: true });

        if (error) throw error;

        // Extract daily occupancy from sessions
        const occupancyData: Record<string, number> = {};
        let dayIndex = 0;
        const currentDate = new Date(checkInDate);
        
        while (currentDate <= checkOutDate) {
          const dateStr = currentDate.toISOString().split('T')[0];
          const session = sessions?.find(s => s.check_date === dateStr);
          
          if (session && session.checklist_responses) {
            const responses = session.checklist_responses as any;
            const dailyOcc = responses.dailyOccupancy;
            
            if (dailyOcc) {
              // Sum up all guests for this day from dailyOccupancy object
              const totalGuests = Object.values(dailyOcc).reduce<number>(
                (sum, val) => sum + (parseInt(String(val)) || 0),
                0
              );
              occupancyData[`day-${dayIndex + 1}`] = totalGuests;
            } else {
              // Fallback to reserved guest count
              occupancyData[`day-${dayIndex + 1}`] = reservedGuests;
            }
          } else {
            // No check-in data for this day - use reserved guest count as fallback
            occupancyData[`day-${dayIndex + 1}`] = reservedGuests;
          }
          
          dayIndex++;
          currentDate.setDate(currentDate.getDate() + 1);
        }

        setDailyOccupancy(occupancyData);
      } catch (error) {
        console.error('Error fetching daily occupancy:', error);
        toast({
          title: 'Error Loading Stay Data',
          description: 'Using reserved guest count for billing calculation',
          variant: 'destructive',
        });
        
        // Fallback: create occupancy data with reserved guests
        const fallbackData: Record<string, number> = {};
        const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 3600 * 24));
        for (let i = 0; i < nights; i++) {
          fallbackData[`day-${i + 1}`] = reservedGuests;
        }
        setDailyOccupancy(fallbackData);
      } finally {
        setLoading(false);
      }
    };

    fetchDailyOccupancy();
  }, [reservationId, checkInDate, checkOutDate, reservedGuests, toast]);

  // Calculate billing from daily occupancy
  const calculateBilling = () => {
    if (!billingConfig || !checkInDate || !checkOutDate) {
      return {
        baseAmount: 0,
        cleaningFee: 0,
        petFee: 0,
        damageDeposit: 0,
        subtotal: 0,
        tax: 0,
        total: 0,
        details: 'No billing data available',
        dayBreakdown: []
      };
    }

    return BillingCalculator.calculateFromDailyOccupancy(
      billingConfig,
      dailyOccupancy,
      { startDate: checkInDate, endDate: checkOutDate }
    );
  };

  const result = calculateBilling();

  // Calculate stats
  const totalDays = Object.keys(dailyOccupancy).length;
  const totalGuests = Object.values(dailyOccupancy).reduce((sum, count) => sum + count, 0);
  const averageGuests = totalDays > 0 ? totalGuests / totalDays : 0;

  // Create deferred payment record
  const createDeferredPayment = async (): Promise<boolean> => {
    if (!organization?.id || !reservationId || !checkInDate || !checkOutDate) {
      toast({
        title: 'Error',
        description: 'Missing required information to create payment',
        variant: 'destructive',
      });
      return false;
    }

    try {
      // Get current user and family group info
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data: reservation } = await supabase
        .from('reservations')
        .select('family_group')
        .eq('id', reservationId)
        .single();

      if (!reservation) throw new Error('Reservation not found');

      // Determine season end date (configurable - using Oct 31 for now)
      const seasonEnd = new Date(checkOutDate.getFullYear(), 9, 31); // Oct 31

      // Convert dailyBreakdown to the format expected by the database
      const dailyOccupancyArray = result.dayBreakdown.map(day => ({
        date: day.date,
        guests: day.guests,
        cost: day.cost
      }));

      const { error } = await supabase.from('payments').insert({
        organization_id: organization.id,
        reservation_id: reservationId,
        family_group: reservation.family_group,
        payment_type: 'use_fee',
        amount: result.total,
        amount_paid: 0,
        status: 'deferred',
        due_date: seasonEnd.toISOString().split('T')[0],
        description: `Use fee - ${checkInDate.toLocaleDateString()} to ${checkOutDate.toLocaleDateString()} (${totalDays} days)`,
        notes: `Deferred payment. Average ${averageGuests.toFixed(1)} guests per day.`,
        daily_occupancy: dailyOccupancyArray,
        created_by_user_id: user.id,
      });

      if (error) throw error;

      toast({
        title: 'Payment Deferred',
        description: `Payment of ${BillingCalculator.formatCurrency(result.total)} has been deferred to end of season.`,
      });

      return true;
    } catch (error: any) {
      console.error('Error creating deferred payment:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to defer payment',
        variant: 'destructive',
      });
      return false;
    }
  };

  return {
    dailyBreakdown: result.dayBreakdown,
    billing: {
      baseAmount: result.baseAmount,
      cleaningFee: result.cleaningFee,
      petFee: result.petFee,
      damageDeposit: result.damageDeposit,
      subtotal: result.subtotal,
      tax: result.tax,
      total: result.total,
      details: result.details,
    },
    totalDays,
    averageGuests,
    loading,
    createDeferredPayment,
  };
};
