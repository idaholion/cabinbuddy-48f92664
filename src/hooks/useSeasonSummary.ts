import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/hooks/useOrganization';
import { useToast } from '@/hooks/use-toast';
import { BillingCalculator } from '@/lib/billing-calculator';
import { useFinancialSettings } from '@/hooks/useFinancialSettings';

interface SeasonConfig {
  startDate: Date;
  endDate: Date;
  paymentDeadline: Date;
  seasonName: string;
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

export const useSeasonSummary = (seasonYear?: number) => {
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
    };
  };

  // Generate array of dates between start and end
  const generateDateRange = (startDate: string, endDate: string): string[] => {
    const dates: string[] = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
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

      // Get user's family group
      const { data: profileData } = await supabase
        .from('profiles')
        .select('family_group')
        .eq('user_id', user.id)
        .eq('organization_id', organization.id)
        .maybeSingle();

      if (!profileData?.family_group) {
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

      // Fetch reservations within season dates for user's family group
      const { data: reservations, error: resError } = await supabase
        .from('reservations')
        .select('*')
        .eq('organization_id', organization.id)
        .eq('family_group', profileData.family_group)
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
        // Fetch daily check-in data
        const { data: checkIns } = await supabase
          .from('checkin_sessions')
          .select('check_date, guest_names')
          .eq('organization_id', organization.id)
          .eq('family_group', profileData.family_group)
          .gte('check_date', reservation.start_date)
          .lt('check_date', reservation.end_date);

        // Calculate billing using daily occupancy
        let billing: any;
        const nights = Math.ceil(
          (new Date(reservation.end_date).getTime() - new Date(reservation.start_date).getTime()) / (1000 * 60 * 60 * 24)
        );

        if (checkIns && checkIns.length > 0 && financialSettings) {
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
              startDate: new Date(reservation.start_date),
              endDate: new Date(reservation.end_date),
            }
          );

          // Calculate actual guest averages
          checkIns.forEach(ci => {
            actualGuestDays += ci.guest_names?.length || 0;
            totalActualDays++;
          });
        } else {
          // Fallback to reserved guests if no check-in data
          billing = BillingCalculator.calculateStayBilling(
            {
              method: financialSettings?.billing_method as any || 'per-person-per-day',
              amount: financialSettings?.billing_amount || 0,
              taxRate: financialSettings?.tax_rate,
              cleaningFee: financialSettings?.cleaning_fee,
              petFee: financialSettings?.pet_fee,
              damageDeposit: financialSettings?.damage_deposit,
            },
            {
              guests: reservation.guest_count || 1,
              nights,
              checkInDate: new Date(reservation.start_date),
              checkOutDate: new Date(reservation.end_date),
            }
          );
        }

        // Find linked payment
        const { data: payment } = await supabase
          .from('payments')
          .select('*')
          .eq('reservation_id', reservation.id)
          .maybeSingle();

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

  useEffect(() => {
    if (organization?.id && user?.email) {
      fetchSeasonData();
    }
  }, [organization?.id, user?.email, year]);

  return {
    summary,
    loading,
    refetch: fetchSeasonData,
    createSeasonPayment,
  };
};
