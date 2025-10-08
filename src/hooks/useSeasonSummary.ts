import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/hooks/useOrganization';
import { useToast } from '@/hooks/use-toast';
import { BillingCalculator } from '@/lib/billing-calculator';
import { useFinancialSettings } from '@/hooks/useFinancialSettings';
import { parseDateOnly, calculateNights } from '@/lib/date-utils';

interface SeasonConfig {
  startDate: Date;
  endDate: Date;
  paymentDeadline: Date;
  seasonName: string;
  season_start_month: number;
  season_start_day: number;
  season_end_month: number;
  season_end_day: number;
  season_payment_deadline_offset_days: number;
}

interface DailyCheckIn {
  check_date: string;
  guest_names: string[];
}

interface SeasonStay {
  reservation: any;
  billing: any;
  payment?: any;
  missingCheckIns: string[];
  hasCompleteData: boolean;
}

interface SeasonSummary {
  config: SeasonConfig;
  stays: SeasonStay[];
  totals: {
    totalStays: number;
    totalNights: number;
    totalCharged: number;
    totalPaid: number;
    outstandingBalance: number;
    reservedGuestsTotal: number;
    actualGuestsAvg: number;
  };
}

export const useSeasonSummary = (seasonYear?: number, familyGroupOverride?: string) => {
  const [summary, setSummary] = useState<SeasonSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { organization } = useOrganization();
  const { toast } = useToast();
  const { settings: financialSettings } = useFinancialSettings();

  const year = seasonYear || new Date().getFullYear();

  // Fetch season configuration
  const fetchSeasonConfig = async (): Promise<SeasonConfig> => {
    if (!organization?.id) throw new Error('No organization');

    const { data, error } = await supabase
      .from('reservation_settings')
      .select('season_start_month, season_start_day, season_end_month, season_end_day, season_payment_deadline_offset_days')
      .eq('organization_id', organization.id)
      .maybeSingle();

    if (error) throw error;

    // Default to Oct 1 - Oct 31 if not configured
    const startMonth = data?.season_start_month || 10;
    const startDay = data?.season_start_day || 1;
    const endMonth = data?.season_end_month || 10;
    const endDay = data?.season_end_day || 31;
    const offsetDays = data?.season_payment_deadline_offset_days || 0;

    const startDate = new Date(year, startMonth - 1, startDay);
    const endDate = new Date(year, endMonth - 1, endDay);
    const paymentDeadline = new Date(endDate);
    paymentDeadline.setDate(paymentDeadline.getDate() + offsetDays);

    return {
      startDate,
      endDate,
      paymentDeadline,
      seasonName: `${year} Season`,
      season_start_month: startMonth,
      season_start_day: startDay,
      season_end_month: endMonth,
      season_end_day: endDay,
      season_payment_deadline_offset_days: offsetDays,
    };
  };

  // Generate array of dates between start and end
  const generateDateRange = (startDate: string, endDate: string): string[] => {
    const dates: string[] = [];
    const start = parseDateOnly(startDate);
    const end = parseDateOnly(endDate);
    const current = new Date(start);

    while (current < end) {
      dates.push(current.toISOString().split('T')[0]);
      current.setDate(current.getDate() + 1);
    }

    return dates;
  };

  // Identify missing check-in dates
  const identifyMissingCheckIns = (reservation: any, checkInSessions: any[]): string[] => {
    const stayDates = generateDateRange(reservation.start_date, reservation.end_date);
    const checkInDates = checkInSessions.map(s => s.check_date);
    return stayDates.filter(date => !checkInDates.includes(date));
  };

  // Fetch season data
  const fetchSeasonData = async () => {
    if (!organization?.id || !user?.email) return;

    try {
      setLoading(true);

      // Get season configuration
      const config = await fetchSeasonConfig();

      // Determine which family group to fetch data for
      let targetFamilyGroup = familyGroupOverride;
      
      if (!targetFamilyGroup) {
        // Get user's family group if no override provided
        const { data: profileData } = await supabase
          .from('profiles')
          .select('family_group')
          .eq('user_id', user.id)
          .eq('organization_id', organization.id)
          .maybeSingle();

        targetFamilyGroup = profileData?.family_group;
      }

      if (!targetFamilyGroup) {
        setSummary({
          config,
          stays: [],
          totals: {
            totalStays: 0,
            totalNights: 0,
            totalCharged: 0,
            totalPaid: 0,
            outstandingBalance: 0,
            reservedGuestsTotal: 0,
            actualGuestsAvg: 0,
          },
        });
        setLoading(false);
        return;
      }

      // Fetch reservations within season dates for target family group
      const { data: reservations, error: resError } = await supabase
        .from('reservations')
        .select('*')
        .eq('organization_id', organization.id)
        .eq('family_group', targetFamilyGroup)
        .gte('start_date', config.startDate.toISOString().split('T')[0])
        .lte('end_date', config.endDate.toISOString().split('T')[0])
        .order('start_date', { ascending: false });

      if (resError) throw resError;

      // Process each reservation
      const stays: SeasonStay[] = [];
      let totalCharged = 0;
      let totalPaid = 0;
      let totalNights = 0;
      let reservedGuestsTotal = 0;
      let actualGuestDays = 0;
      let totalActualDays = 0;

      for (const reservation of reservations || []) {
        // Check if reservation is upcoming (hasn't started yet)
        const isUpcoming = parseDateOnly(reservation.start_date) > new Date();
        
        // First, check if there's already a payment with daily_occupancy data
        const { data: payment } = await supabase
          .from('payments')
          .select('*')
          .eq('reservation_id', reservation.id)
          .maybeSingle();

        // Fetch daily check-in data (fallback if no payment occupancy)
        const { data: checkIns } = await supabase
          .from('checkin_sessions')
          .select('check_date, guest_names')
          .eq('organization_id', organization.id)
          .eq('family_group', targetFamilyGroup)
          .gte('check_date', reservation.start_date)
          .lt('check_date', reservation.end_date);

        // Calculate billing using daily occupancy
        let billing: any;
        const nights = calculateNights(reservation.start_date, reservation.end_date);
        
        // Skip billing calculation for upcoming reservations
        if (isUpcoming) {
          billing = { total: 0, breakdown: {} };
          stays.push({
            reservation,
            billing,
            payment: payment || undefined,
            missingCheckIns: [],
            hasCompleteData: false,
          });
          continue; // Skip totals accumulation
        }

        // Priority 1: Calculate from daily occupancy if available (most accurate)
        if (payment?.daily_occupancy && Array.isArray(payment.daily_occupancy) && payment.daily_occupancy.length > 0 && financialSettings) {
          const dailyOccupancy: Record<string, number> = {};
          payment.daily_occupancy.forEach((day: any) => {
            dailyOccupancy[day.date] = day.guests || 0;
            actualGuestDays += day.guests || 0;
            totalActualDays++;
          });

          billing = BillingCalculator.calculateFromDailyOccupancy(
            {
              method: financialSettings.billing_method as any,
              amount: financialSettings.billing_amount || 0,
              taxRate: financialSettings.tax_rate,
              cleaningFee: financialSettings.cleaning_fee,
              petFee: financialSettings.pet_fee,
              damageDeposit: financialSettings.damage_deposit,
            },
            dailyOccupancy,
            {
              startDate: parseDateOnly(reservation.start_date),
              endDate: parseDateOnly(reservation.end_date),
            }
          );
        }
        // Priority 2: If no occupancy data but payment amount exists and is locked, use it
        else if (payment?.amount && payment.billing_locked) {
          billing = {
            total: (payment.amount || 0) + (payment.manual_adjustment_amount || 0),
            breakdown: {
              note: 'Using locked payment amount'
            }
          };
        }
        // Priority 3: If no occupancy data but payment amount exists, use it as fallback
        else if (payment?.amount) {
          billing = {
            total: (payment.amount || 0) + (payment.manual_adjustment_amount || 0),
            breakdown: {
              note: 'Using payment amount (no occupancy data)'
            }
          };
        }
        // Priority 4: If no data at all, show $0 (awaiting data entry)
        else if (!payment?.daily_occupancy || !Array.isArray(payment.daily_occupancy) || payment.daily_occupancy.length === 0) {
          billing = {
            total: 0,
            breakdown: {
              note: 'Awaiting daily occupancy data'
            }
          };
        }
        // Priority 5: Use checkin_sessions data if available
        else if (checkIns && checkIns.length > 0 && financialSettings) {
          const dailyOccupancy: Record<string, number> = {};
          checkIns.forEach(ci => {
            dailyOccupancy[ci.check_date] = ci.guest_names?.length || 0;
          });

          billing = BillingCalculator.calculateFromDailyOccupancy(
            {
              method: financialSettings.billing_method as any,
              amount: financialSettings.billing_amount || 0,
              taxRate: financialSettings.tax_rate,
              cleaningFee: financialSettings.cleaning_fee,
              petFee: financialSettings.pet_fee,
              damageDeposit: financialSettings.damage_deposit,
            },
            dailyOccupancy,
            {
              startDate: parseDateOnly(reservation.start_date),
              endDate: parseDateOnly(reservation.end_date),
            }
          );

          // Calculate actual guest averages
          checkIns.forEach(ci => {
            actualGuestDays += ci.guest_names?.length || 0;
            totalActualDays++;
          });
        } 
        // Priority 6: Fallback to reserved guests if no occupancy data
        else {
          billing = BillingCalculator.calculateStayBilling(
            {
              method: financialSettings?.billing_method as any || 'per_person_per_night',
              amount: financialSettings?.billing_amount || 0,
              taxRate: financialSettings?.tax_rate,
              cleaningFee: financialSettings?.cleaning_fee,
              petFee: financialSettings?.pet_fee,
              damageDeposit: financialSettings?.damage_deposit,
            },
            {
              guests: reservation.guest_count || 1,
              nights,
              checkInDate: parseDateOnly(reservation.start_date),
              checkOutDate: parseDateOnly(reservation.end_date),
            }
          );
        }

        // Identify missing check-ins
        const missingCheckIns = identifyMissingCheckIns(reservation, checkIns || []);

        stays.push({
          reservation,
          billing,
          payment: payment || undefined,
          missingCheckIns,
          hasCompleteData: missingCheckIns.length === 0,
        });

        totalCharged += billing.total;
        totalPaid += payment?.amount_paid || 0;
        totalNights += nights;
        reservedGuestsTotal += (reservation.guest_count || 1) * nights;
      }

      setSummary({
        config,
        stays,
        totals: {
          totalStays: stays.length,
          totalNights,
          totalCharged,
          totalPaid,
          outstandingBalance: totalCharged - totalPaid,
          reservedGuestsTotal,
          actualGuestsAvg: totalActualDays > 0 ? actualGuestDays / totalActualDays : 0,
        },
      });
    } catch (error) {
      console.error('Error fetching season summary:', error);
      toast({
        title: 'Error',
        description: 'Failed to load season summary',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Create season payment
  const createSeasonPayment = async () => {
    if (!summary || !organization?.id || !user?.email) return;

    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('family_group')
        .eq('user_id', user.id)
        .eq('organization_id', organization.id)
        .maybeSingle();

      if (!profileData?.family_group) throw new Error('No family group');

      const { data, error } = await supabase
        .from('payments')
        .insert({
          organization_id: organization.id,
          family_group: profileData.family_group,
          payment_type: 'use_fee',
          amount: summary.totals.outstandingBalance,
          amount_paid: 0,
          description: `${summary.config.seasonName} - Full Balance`,
          due_date: summary.config.paymentDeadline.toISOString().split('T')[0],
          notes: `Includes ${summary.totals.totalStays} stays totaling ${summary.totals.totalNights} nights`,
          status: 'pending',
          created_by_user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Season payment created successfully',
      });

      // Refresh data
      await fetchSeasonData();

      return data;
    } catch (error) {
      console.error('Error creating season payment:', error);
      toast({
        title: 'Error',
        description: 'Failed to create season payment',
        variant: 'destructive',
      });
    }
  };

  const syncReservationsToPayments = async () => {
    if (!organization?.id || !user?.id) {
      console.error('Missing organization or user for sync');
      return { created: 0, existing: 0, errors: [] };
    }

    try {
      const config = await fetchSeasonConfig();

      const startDate = new Date(year, config.season_start_month - 1, config.season_start_day);
      const endDate = new Date(year, config.season_end_month - 1, config.season_end_day);

      // Get user's profile to determine family group
      const { data: profileData } = await supabase
        .from('profiles')
        .select('family_group')
        .eq('user_id', user.id)
        .single();

      if (!profileData?.family_group) {
        throw new Error('User profile or family group not found');
      }

      // Fetch ONLY this family's reservations in season
      const { data: reservations, error: reservationsError } = await supabase
        .from('reservations')
        .select('*')
        .eq('organization_id', organization.id)
        .eq('family_group', profileData.family_group)
        .gte('start_date', startDate.toISOString())
        .lte('end_date', endDate.toISOString());

      if (reservationsError) throw reservationsError;

      // Fetch existing payments
      const { data: existingPayments } = await supabase
        .from('payments')
        .select('reservation_id')
        .eq('organization_id', organization.id)
        .not('reservation_id', 'is', null);

      const existingReservationIds = new Set(
        existingPayments?.map(p => p.reservation_id) || []
      );

      let created = 0;
      const errors: string[] = [];

      // Create payments for reservations without them
      for (const reservation of reservations || []) {
        if (existingReservationIds.has(reservation.id)) {
          continue;
        }

        try {
          // Create payment record with $0 amount - will be calculated when occupancy is entered
          const { error: paymentError } = await supabase
            .from('payments')
            .insert([{
              organization_id: organization.id,
              reservation_id: reservation.id,
              family_group: reservation.family_group,
              amount: 0,
              amount_paid: 0,
              status: 'pending',
              payment_type: 'use_fee',
              description: `Season ${year} - ${reservation.family_group}`,
              created_by_user_id: user.id,
              daily_occupancy: [],
            }]);

          if (paymentError) {
            errors.push(`${reservation.family_group}: ${paymentError.message}`);
          } else {
            created++;
          }
        } catch (err) {
          errors.push(`${reservation.family_group}: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
      }

      return {
        created,
        existing: existingReservationIds.size,
        errors,
      };
    } catch (error) {
      console.error('Error syncing reservations:', error);
      throw error;
    }
  };

  const updateOccupancy = async (paymentId: string, occupancy: any[]) => {
    if (!financialSettings) {
      throw new Error('Financial settings not loaded');
    }

    // Get the payment and reservation details
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('*')
      .eq('id', paymentId)
      .single();

    if (paymentError) throw paymentError;
    
    if (!payment.reservation_id) {
      throw new Error('Payment has no associated reservation');
    }

    // Get the reservation
    const { data: reservation, error: reservationError } = await supabase
      .from('reservations')
      .select('*')
      .eq('id', payment.reservation_id)
      .single();

    if (reservationError) throw reservationError;

    // Filter out days with 0 guests (user removed those days)
    const validOccupancy = occupancy.filter((day: any) => day.guests > 0);

    console.log('useSeasonSummary - updateOccupancy called with:', occupancy);
    console.log('Valid occupancy (after filtering 0s):', validOccupancy);
    console.log('Total guests:', validOccupancy.reduce((sum: number, day: any) => sum + (day.guests || 0), 0));

    // Calculate billing from the new occupancy data
    const dailyOccupancy: Record<string, number> = {};
    validOccupancy.forEach((day: any) => {
      dailyOccupancy[day.date] = day.guests || 0;
    });

    console.log('Daily occupancy object:', dailyOccupancy);
    console.log('Financial settings:', {
      method: financialSettings.billing_method,
      amount: financialSettings.billing_amount,
      taxRate: financialSettings.tax_rate,
      cleaningFee: financialSettings.cleaning_fee,
      petFee: financialSettings.pet_fee,
      damageDeposit: financialSettings.damage_deposit,
    });

    const billing = BillingCalculator.calculateFromDailyOccupancy(
      {
        method: financialSettings.billing_method as any || 'per_person_per_night',
        amount: financialSettings.billing_amount || 0,
        taxRate: financialSettings.tax_rate,
        cleaningFee: financialSettings.cleaning_fee,
        petFee: financialSettings.pet_fee,
        damageDeposit: financialSettings.damage_deposit,
      },
      dailyOccupancy,
      {
        startDate: parseDateOnly(reservation.start_date),
        endDate: parseDateOnly(reservation.end_date),
      }
    );

    console.log('Billing calculation result:', billing);

    // Use the billing's dayBreakdown which includes the calculated cost per day
    const enrichedOccupancy = billing.dayBreakdown;

    // Update occupancy with costs and amount (allow negative balance for overpayments)
    const updates: any = { 
      daily_occupancy: enrichedOccupancy,
      amount: billing.total
    };

    const { error } = await supabase
      .from('payments')
      .update(updates)
      .eq('id', paymentId);

    if (error) throw error;
    
    toast({
      title: 'Occupancy Updated',
      description: `Charges recalculated: ${BillingCalculator.formatCurrency(billing.total)}`,
    });
    
    await fetchSeasonData();
  };

  const adjustBilling = async (
    paymentId: string,
    adjustment: number,
    notes: string,
    locked: boolean
  ) => {
    const { error } = await supabase
      .from('payments')
      .update({
        manual_adjustment_amount: adjustment,
        adjustment_notes: notes,
        billing_locked: locked,
      })
      .eq('id', paymentId);

    if (error) throw error;
    await fetchSeasonData();
  };

  useEffect(() => {
    if (organization?.id && user?.email) {
      fetchSeasonData();
    }
  }, [organization?.id, user?.email, year, familyGroupOverride]);

  return {
    summary,
    loading,
    refetch: fetchSeasonData,
    createSeasonPayment,
    syncReservationsToPayments,
    updateOccupancy,
    adjustBilling,
  };
};
