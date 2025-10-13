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
  billingLocked: boolean;
  refetch: () => Promise<void>;
  createDeferredPayment: () => Promise<boolean>;
  createSplitPayment: (
    splitToUserId: string,
    splitToFamilyGroup: string,
    dailyOccupancySplit: Array<{ date: string; guests: number; cost: number }>,
    splitAmount: number
  ) => Promise<{ sourcePaymentId: string; splitPaymentId: string } | null>;
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
  const [billingLocked, setBillingLocked] = useState(false);
  const { organization } = useOrganization();
  const { toast } = useToast();

  // Fetch daily check-in data
  const fetchDailyOccupancy = async () => {
    if (!checkInDate || !checkOutDate) {
      setLoading(false);
      return;
    }

    // Generate sample data if no reservation (for demo/preview)
    if (!reservationId) {
        const sampleOccupancy: Record<string, number> = {};
        const currentDate = new Date(checkInDate);
        const guestCounts = [4, 5, 4, 3]; // Varying guest counts for realism
        let dayIndex = 0;
        
        while (currentDate < checkOutDate) {
          const dateStr = currentDate.toISOString().split('T')[0];
          sampleOccupancy[dateStr] = guestCounts[dayIndex % guestCounts.length];
          currentDate.setDate(currentDate.getDate() + 1);
          dayIndex++;
        }
        
        setDailyOccupancy(sampleOccupancy);
        setLoading(false);
        return;
      }

      try {
        // First, check if payment record exists (source of truth)
        const { data: payment } = await supabase
          .from('payments')
          .select('daily_occupancy, billing_locked')
          .eq('reservation_id', reservationId)
          .maybeSingle();

        if (payment) {
          console.log('useCheckoutBilling - Found payment with daily_occupancy:', payment);
          setBillingLocked(payment.billing_locked ?? false);
          
          // Only use payment.daily_occupancy if it has actual data
          if (payment.daily_occupancy && Array.isArray(payment.daily_occupancy) && payment.daily_occupancy.length > 0) {
            const occupancyRecord: Record<string, number> = {};
            (payment.daily_occupancy as any[]).forEach((day: any) => {
              occupancyRecord[day.date] = day.guests;
            });
            setDailyOccupancy(occupancyRecord);
            setLoading(false);
            return;
          }
          // If daily_occupancy is empty, fall through to fetch from checkin_sessions
        }

        // Build query with organization filter
        let query = supabase
          .from('checkin_sessions')
          .select('check_date, checklist_responses, family_group')
          .eq('session_type', 'daily')
          .gte('check_date', checkInDate.toISOString().split('T')[0])
          .lt('check_date', checkOutDate.toISOString().split('T')[0])
          .order('check_date', { ascending: true });

        // Add organization filter if available
        if (organization?.id) {
          query = query.eq('organization_id', organization.id);
        }

        const { data: sessions, error } = await query;

        if (error) throw error;

        console.log('📊 [CHECKOUT-BILLING] Fetched daily sessions:', sessions);

        // Extract daily occupancy from sessions
        // NOTE: Only count nights spent, not the checkout day
        const occupancyData: Record<string, number> = {};
        const currentDate = new Date(checkInDate);
        
        while (currentDate < checkOutDate) {
          const dateStr = currentDate.toISOString().split('T')[0];
          const session = sessions?.find(s => s.check_date === dateStr);
          
          console.log(`📅 [CHECKOUT-BILLING] Processing ${dateStr}:`, {
            hasSession: !!session,
            familyGroup: session?.family_group,
            hasResponses: !!session?.checklist_responses
          });
          
          if (session && session.checklist_responses) {
            const responses = session.checklist_responses as any;
            const dailyOcc = responses.dailyOccupancy;
            
            console.log(`  Daily occupancy data for ${dateStr}:`, dailyOcc);
            
            if (dailyOcc) {
              // Sum up all guests for this day from dailyOccupancy object
              const totalGuests = Object.values(dailyOcc).reduce<number>(
                (sum, val) => sum + (parseInt(String(val)) || 0),
                0
              );
              console.log(`  Total guests calculated: ${totalGuests}`);
              occupancyData[dateStr] = totalGuests;
            } else {
              // Fallback to reserved guest count
              console.log(`  No dailyOccupancy data, using reserved guests: ${reservedGuests}`);
              occupancyData[dateStr] = reservedGuests;
            }
          } else {
            // No check-in data for this day - use reserved guest count as fallback
            console.log(`  No session found, using reserved guests: ${reservedGuests}`);
            occupancyData[dateStr] = reservedGuests;
          }
          
          currentDate.setDate(currentDate.getDate() + 1);
        }

        console.log('📊 [CHECKOUT-BILLING] Final occupancy data:', occupancyData);
        setDailyOccupancy(occupancyData);
      } catch (error) {
        console.error('Error fetching daily occupancy:', error);
        toast({
          title: 'Error Loading Stay Data',
          description: 'Using reserved guest count for billing calculation',
          variant: 'destructive',
        });
        
        // Fallback: create occupancy data with reserved guests
        // Only count nights spent (exclude checkout day)
        const fallbackData: Record<string, number> = {};
        const fallbackDate = new Date(checkInDate);
        while (fallbackDate < checkOutDate) {
          const dateStr = fallbackDate.toISOString().split('T')[0];
          fallbackData[dateStr] = reservedGuests;
          fallbackDate.setDate(fallbackDate.getDate() + 1);
        }
        setDailyOccupancy(fallbackData);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
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

  // Create split payment (for guest cost splitting)
  const createSplitPayment = async (
    splitToUserId: string,
    splitToFamilyGroup: string,
    dailyOccupancySplit: Array<{ date: string; guests: number; cost: number }>,
    splitAmount: number
  ): Promise<{ sourcePaymentId: string; splitPaymentId: string } | null> => {
    if (!organization?.id || !reservationId || !checkInDate || !checkOutDate) {
      toast({
        title: 'Error',
        description: 'Missing required information to create split payment',
        variant: 'destructive',
      });
      return null;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data: reservation } = await supabase
        .from('reservations')
        .select('family_group')
        .eq('id', reservationId)
        .single();

      if (!reservation) throw new Error('Reservation not found');

      const seasonEnd = new Date(checkOutDate.getFullYear(), 9, 31);

      // Create guest's payment (Person B)
      const { data: splitPayment, error: splitPaymentError } = await supabase
        .from('payments')
        .insert({
          organization_id: organization.id,
          reservation_id: reservationId,
          family_group: splitToFamilyGroup,
          payment_type: 'use_fee',
          amount: splitAmount,
          amount_paid: 0,
          status: 'deferred',
          due_date: seasonEnd.toISOString().split('T')[0],
          description: `Guest cost split - ${checkInDate.toLocaleDateString()} to ${checkOutDate.toLocaleDateString()}`,
          notes: `Split from ${reservation.family_group}`,
          daily_occupancy: dailyOccupancySplit,
          created_by_user_id: user.id,
        })
        .select()
        .single();

      if (splitPaymentError) throw splitPaymentError;

      // Create source payment (Person A - reduced amount)
      const reducedAmount = result.total - splitAmount;
      const reducedDailyOccupancy = result.dayBreakdown.map(day => ({
        date: day.date,
        guests: day.guests - (dailyOccupancySplit.find(s => s.date === day.date)?.guests || 0),
        cost: day.cost - (dailyOccupancySplit.find(s => s.date === day.date)?.cost || 0)
      }));

      const { data: sourcePayment, error: sourcePaymentError } = await supabase
        .from('payments')
        .insert({
          organization_id: organization.id,
          reservation_id: reservationId,
          family_group: reservation.family_group,
          payment_type: 'use_fee',
          amount: reducedAmount,
          amount_paid: 0,
          status: 'deferred',
          due_date: seasonEnd.toISOString().split('T')[0],
          description: `Use fee - ${checkInDate.toLocaleDateString()} to ${checkOutDate.toLocaleDateString()} (${totalDays} days, split)`,
          notes: `Cost split with ${splitToFamilyGroup}`,
          daily_occupancy: reducedDailyOccupancy,
          created_by_user_id: user.id,
        })
        .select()
        .single();

      if (sourcePaymentError) throw sourcePaymentError;

      // Create split tracking record
      const { data: splitRecord, error: splitRecordError } = await supabase
        .from('payment_splits')
        .insert({
          organization_id: organization.id,
          source_payment_id: sourcePayment.id,
          split_payment_id: splitPayment.id,
          source_family_group: reservation.family_group,
          source_user_id: user.id,
          split_to_family_group: splitToFamilyGroup,
          split_to_user_id: splitToUserId,
          daily_occupancy_split: dailyOccupancySplit,
          created_by_user_id: user.id,
          notification_status: 'pending'
        })
        .select()
        .single();

      if (splitRecordError) throw splitRecordError;

      // Send notification
      await supabase.functions.invoke('send-guest-split-notification', {
        body: {
          splitId: splitRecord.id,
          organizationId: organization.id
        }
      });

      return {
        sourcePaymentId: sourcePayment.id,
        splitPaymentId: splitPayment.id
      };

    } catch (error: any) {
      console.error('Error creating split payment:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create split payment',
        variant: 'destructive',
      });
      return null;
    }
  };

  // Refetch function to manually reload occupancy data
  const refetch = async () => {
    setLoading(true);
    await fetchDailyOccupancy();
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
    billingLocked,
    refetch,
    createDeferredPayment,
    createSplitPayment,
  };
};
