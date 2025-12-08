import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { BillingCalculator } from '@/lib/billing-calculator';
import { parseDateOnly } from '@/lib/date-utils';

interface DailyOccupancyData {
  date: string;
  guests: number;
  names?: string[];
}

interface BillingConfig {
  baseFee: number;
  perPersonFee: number;
  taxRate: number;
}

interface SyncOptions {
  skipBillingRecalc?: boolean;
  showToast?: boolean;
}

export const useDailyOccupancySync = (organizationId: string) => {
  const { toast } = useToast();
  const [syncing, setSyncing] = useState(false);

  const fetchOccupancyData = useCallback(async (
    reservationId: string,
    checkInDate: Date,
    checkOutDate: Date
  ): Promise<DailyOccupancyData[]> => {
    try {
      // First, try to get from payments table (source of truth)
      const { data: payment } = await supabase
        .from('payments')
        .select('daily_occupancy')
        .eq('reservation_id', reservationId)
        .maybeSingle();

      if (payment?.daily_occupancy && Array.isArray(payment.daily_occupancy)) {
        return (payment.daily_occupancy as any[]).map(item => ({
          date: item.date,
          guests: item.guests,
          names: item.names
        }));
      }

      // Fallback to checkin_sessions
      const { data: sessions } = await supabase
        .from('checkin_sessions')
        .select('checklist_responses')
        .eq('organization_id', organizationId)
        .gte('check_date', checkInDate.toISOString().split('T')[0])
        .lte('check_date', checkOutDate.toISOString().split('T')[0]);

      if (!sessions) return [];

      const occupancyMap = new Map<string, DailyOccupancyData>();
      sessions.forEach(session => {
        const responses = session.checklist_responses as any;
        if (responses?.dailyOccupancy) {
          Object.entries(responses.dailyOccupancy).forEach(([date, count]) => {
            occupancyMap.set(date, { date, guests: count as number });
          });
        }
      });

      return Array.from(occupancyMap.values()).sort((a, b) => 
        a.date.localeCompare(b.date)
      );
    } catch (error) {
      console.error('Error fetching occupancy data:', error);
      return [];
    }
  }, [organizationId]);

  const updateOccupancy = useCallback(async (
    reservationId: string,
    occupancyData: DailyOccupancyData[],
    options: SyncOptions = {}
  ) => {
    const { skipBillingRecalc = false, showToast: shouldShowToast = true } = options;
    setSyncing(true);

    try {
      // 1. Find ALL payment records for this reservation
      const { data: paymentsArray, error: paymentFetchError } = await supabase
        .from('payments')
        .select('*')
        .eq('reservation_id', reservationId);

      if (paymentFetchError) throw paymentFetchError;

      // Get reservation and settings data
      const { data: reservation } = await supabase
        .from('reservations')
        .select('start_date, end_date, family_group, organization_id')
        .eq('id', reservationId)
        .single();

      if (!reservation) {
        throw new Error('Reservation not found');
      }

      const { data: settingsArray, error: settingsError } = await supabase
        .from('reservation_settings')
        .select('*')
        .eq('organization_id', organizationId)
        .limit(1);

      if (settingsError) {
        console.error('Error fetching settings:', settingsError);
      }

      const settings = settingsArray?.[0];

      // If no payment exists, create one
      if (!paymentsArray || paymentsArray.length === 0) {
        console.log('No payment found for reservation, creating one...');
        
        // Calculate billing amount
        let amount = 0;
        if (settings && !skipBillingRecalc) {
          const billingConfig = {
            method: (settings as any).financial_method || 'per_person_per_night',
            amount: (settings as any).nightly_rate || 0,
            taxRate: settings.tax_rate || 0,
          };

          const dailyOccupancyRecord: Record<string, number> = {};
          occupancyData.forEach(day => {
            dailyOccupancyRecord[day.date] = day.guests;
          });

          const billing = BillingCalculator.calculateFromDailyOccupancy(
            billingConfig as any,
            dailyOccupancyRecord,
            { startDate: parseDateOnly(reservation.start_date), endDate: parseDateOnly(reservation.end_date) }
          );
          amount = billing.total;
        }

        const { error: insertError } = await supabase
          .from('payments')
          .insert({
            reservation_id: reservationId,
            organization_id: reservation.organization_id,
            family_group: reservation.family_group,
            amount: amount,
            daily_occupancy: occupancyData,
            description: `Use fee - ${reservation.start_date} to ${reservation.end_date}`,
            status: 'pending',
          } as any);

        if (insertError) throw insertError;
        
        if (shouldShowToast) {
          toast({
            title: "Payment record created",
            description: "Guest counts and billing have been set",
          });
        }
      } else {
        // Update ALL existing payment records
        for (const payment of paymentsArray) {
          const updates: any = {
            daily_occupancy: occupancyData,
            updated_at: new Date().toISOString(),
          };

          // Recalculate billing if not locked and not skipped
          if (!payment.billing_locked && !skipBillingRecalc && settings) {
            const billingConfig = {
              method: (settings as any).financial_method || 'per_person_per_night',
              amount: (settings as any).nightly_rate || 0,
              taxRate: settings.tax_rate || 0,
            };

            // Convert array to Record format
            const dailyOccupancyRecord: Record<string, number> = {};
            occupancyData.forEach(day => {
              dailyOccupancyRecord[day.date] = day.guests;
            });

            const billing = BillingCalculator.calculateFromDailyOccupancy(
              billingConfig as any,
              dailyOccupancyRecord,
              { startDate: parseDateOnly(reservation.start_date), endDate: parseDateOnly(reservation.end_date) }
            );
            
            // Preserve manual adjustment when recalculating
            const manualAdjustment = (payment as any).manual_adjustment_amount || 0;
            updates.amount = billing.total + manualAdjustment;
            updates.manual_adjustment_amount = manualAdjustment;
          }

          const { error: updateError } = await supabase
            .from('payments')
            .update(updates)
            .eq('id', payment.id);

          if (updateError) throw updateError;
        }

        if (shouldShowToast) {
          const hasLockedPayments = paymentsArray?.some(p => p.billing_locked);
          toast({
            title: hasLockedPayments 
              ? "Guest counts updated" 
              : "Guest counts and billing updated",
            description: hasLockedPayments
              ? "Billing is locked - costs remain unchanged"
              : "Charges have been recalculated",
          });
        }
      }

      // 4. Update checkin_sessions (backfill for bidirectional sync)
      const occupancyMap = occupancyData.reduce((acc, day) => {
        acc[day.date] = day.guests;
        return acc;
      }, {} as Record<string, number>);

      for (const day of occupancyData) {
        const { data: session } = await supabase
          .from('checkin_sessions')
          .select('*')
          .eq('organization_id', organizationId)
          .eq('check_date', day.date)
          .maybeSingle();

        if (session) {
          const responses = (session.checklist_responses as any) || {};
          responses.dailyOccupancy = {
            ...(responses.dailyOccupancy || {}),
            [day.date]: day.guests,
          };

          await supabase
            .from('checkin_sessions')
            .update({ checklist_responses: responses })
            .eq('id', session.id);
        }
      }

      if (shouldShowToast) {
        const hasLockedPayments = paymentsArray?.some(p => p.billing_locked);
        toast({
          title: hasLockedPayments 
            ? "Guest counts updated" 
            : "Guest counts and billing updated",
          description: hasLockedPayments
            ? "Billing is locked - costs remain unchanged"
            : "Charges have been recalculated",
        });
      }

      return { success: true };
    } catch (error) {
      console.error('Error updating occupancy:', error);
      if (shouldShowToast) {
        toast({
          title: "Error updating occupancy",
          description: "Please try again",
          variant: "destructive",
        });
      }
      return { success: false, error };
    } finally {
      setSyncing(false);
    }
  }, [organizationId, toast]);

  const getBillingLockStatus = useCallback(async (reservationId: string): Promise<boolean> => {
    try {
      const { data: payment } = await supabase
        .from('payments')
        .select('billing_locked')
        .eq('reservation_id', reservationId)
        .maybeSingle();

      return payment?.billing_locked ?? false;
    } catch (error) {
      console.error('Error fetching billing lock status:', error);
      return false;
    }
  }, []);

  const recalculateBilling = useCallback(async (
    reservationId: string,
    occupancyData: DailyOccupancyData[]
  ) => {
    setSyncing(true);
    try {
      const { data: payment } = await supabase
        .from('payments')
        .select('billing_locked')
        .eq('reservation_id', reservationId)
        .maybeSingle();

      if (!payment) {
        throw new Error('Payment not found');
      }

      if (payment.billing_locked) {
        toast({
          title: "Billing is locked",
          description: "Unlock billing to recalculate charges",
          variant: "destructive",
        });
        return { success: false };
      }

      // Force recalculation
      return await updateOccupancy(reservationId, occupancyData, { 
        skipBillingRecalc: false,
        showToast: true 
      });
    } catch (error) {
      console.error('Error recalculating billing:', error);
      toast({
        title: "Error recalculating billing",
        description: "Please try again",
        variant: "destructive",
      });
      return { success: false, error };
    } finally {
      setSyncing(false);
    }
  }, [toast, updateOccupancy]);

  const updateSplitOccupancy = useCallback(async (
    splitId: string,
    splitPaymentId: string,
    occupancyData: DailyOccupancyData[]
  ) => {
    setSyncing(true);
    try {
      // 1. Get the split record and associated data (including original split format)
      const { data: split, error: splitError } = await supabase
        .from('payment_splits')
        .select('*, source_payment:payments!payment_splits_source_payment_id_fkey(*)')
        .eq('id', splitId)
        .single();

      if (splitError) throw splitError;

      // 2. Check if source payment is billing locked
      const sourceLocked = split.source_payment?.billing_locked ?? false;

      // 3. Get financial settings
      const { data: settingsArray } = await supabase
        .from('reservation_settings')
        .select('*')
        .eq('organization_id', organizationId)
        .limit(1);

      const settings = settingsArray?.[0];
      const perDiem = (settings as any)?.nightly_rate || 10;

      // 4. Get original split data to preserve source guest counts
      const originalSplitData = split.daily_occupancy_split as any[] || [];

      // 5. Build updated daily_occupancy_split in correct format
      // Preserve sourceGuests from original, update recipientGuests from new data
      const updatedSplitData = occupancyData.map(day => {
        // Find original data for this date to get sourceGuests
        const originalDay = originalSplitData.find((d: any) => d.date === day.date);
        const sourceGuests = originalDay?.sourceGuests ?? 0;
        const recipientGuests = day.guests;
        const recipientCost = recipientGuests * perDiem;

        return {
          date: day.date,
          sourceGuests,
          recipientGuests,
          perDiem,
          recipientCost,
        };
      });

      // 6. Calculate new billing amount from updated recipient guests
      let newAmount = 0;
      if (!sourceLocked) {
        newAmount = updatedSplitData.reduce((sum, day) => sum + day.recipientCost, 0);
      }

      // 7. Update payment_splits.daily_occupancy_split with correct format
      const { error: splitUpdateError } = await supabase
        .from('payment_splits')
        .update({
          daily_occupancy_split: updatedSplitData as any,
          updated_at: new Date().toISOString(),
        })
        .eq('id', splitId);

      if (splitUpdateError) throw splitUpdateError;

      // 8. Update the split payment record
      const { data: splitPayment } = await supabase
        .from('payments')
        .select('amount_paid')
        .eq('id', splitPaymentId)
        .single();

      const amountPaid = splitPayment?.amount_paid || 0;
      const newBalanceDue = newAmount - amountPaid;

      // Convert to simple format for payment.daily_occupancy
      const paymentDailyOccupancy = occupancyData.map(day => ({
        date: day.date,
        guests: day.guests,
        cost: day.guests * perDiem,
      }));

      const paymentUpdates: any = {
        daily_occupancy: paymentDailyOccupancy,
        updated_at: new Date().toISOString(),
      };

      // Only update amount if not locked
      // Note: balance_due is a generated column, so we don't update it directly
      if (!sourceLocked) {
        paymentUpdates.amount = newAmount;
        paymentUpdates.status = newBalanceDue <= 0 ? 'paid' : amountPaid > 0 ? 'partial' : 'pending';
      }

      const { error: paymentUpdateError } = await supabase
        .from('payments')
        .update(paymentUpdates)
        .eq('id', splitPaymentId);

      if (paymentUpdateError) throw paymentUpdateError;

      toast({
        title: sourceLocked 
          ? "Guest counts updated" 
          : "Guest counts and billing updated",
        description: sourceLocked
          ? "Source billing is locked - costs remain unchanged"
          : `Split charges updated to $${newAmount}`,
      });

      return { success: true };
    } catch (error) {
      console.error('Error updating split occupancy:', error);
      toast({
        title: "Error updating split occupancy",
        description: "Please try again",
        variant: "destructive",
      });
      return { success: false, error };
    } finally {
      setSyncing(false);
    }
  }, [organizationId, toast]);

  return {
    fetchOccupancyData,
    updateOccupancy,
    updateSplitOccupancy,
    getBillingLockStatus,
    recalculateBilling,
    syncing,
  };
};
