import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { useToast } from '@/hooks/use-toast';
import { BillingCalculator } from '@/lib/billing-calculator';
import { parseDateOnly, calculateNights } from '@/lib/date-utils';

interface SeasonConfig {
  startDate: Date;
  endDate: Date;
  paymentDeadline: Date;
  seasonName: string;
}

interface FamilySummary {
  familyGroup: string;
  totalStays: number;
  totalNights: number;
  totalCharged: number;
  totalPaid: number;
  outstandingBalance: number;
  leadEmail?: string;
  leadPhone?: string;
}

interface AdminSeasonSummary {
  config: SeasonConfig;
  familySummaries: FamilySummary[];
  totals: {
    totalFamilies: number;
    totalStays: number;
    totalNights: number;
    totalCharged: number;
    totalPaid: number;
    totalOutstanding: number;
  };
}

export const useAdminSeasonSummary = (seasonYear?: number) => {
  const [summary, setSummary] = useState<AdminSeasonSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const { organization } = useOrganization();
  const { toast } = useToast();

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

  const fetchAdminSeasonData = async () => {
    if (!organization?.id) return;

    try {
      setLoading(true);

      // Get season configuration
      const config = await fetchSeasonConfig();

      // Fetch financial settings
      const { data: financialSettingsData } = await supabase
        .from('reservation_settings')
        .select('*')
        .eq('organization_id', organization.id)
        .maybeSingle();

      const financialSettings = financialSettingsData ? {
        billing_method: financialSettingsData.financial_method || 'per-person-per-day',
        billing_amount: financialSettingsData.nightly_rate || 0,
        tax_rate: financialSettingsData.tax_rate || 0,
        cleaning_fee: financialSettingsData.cleaning_fee || 0,
        pet_fee: financialSettingsData.pet_fee || 0,
        damage_deposit: financialSettingsData.damage_deposit || 0,
      } : null;

      // Fetch all family groups
      const { data: familyGroups, error: familyGroupsError } = await supabase
        .from('family_groups')
        .select('name, lead_email, lead_phone')
        .eq('organization_id', organization.id)
        .order('name');

      if (familyGroupsError) throw familyGroupsError;

      // Fetch all reservations within season
      const { data: reservations, error: reservationsError } = await supabase
        .from('reservations')
        .select('*')
        .eq('organization_id', organization.id)
        .gte('start_date', config.startDate.toISOString().split('T')[0])
        .lte('end_date', config.endDate.toISOString().split('T')[0]);

      if (reservationsError) throw reservationsError;

      // Fetch all payments for the season
      const { data: payments, error: paymentsError } = await supabase
        .from('payments')
        .select('*')
        .eq('organization_id', organization.id)
        .not('reservation_id', 'is', null);

      if (paymentsError) throw paymentsError;

      // Create payment lookup map
      const paymentsByReservation = new Map<string, any>();
      payments?.forEach(payment => {
        if (payment.reservation_id) {
          paymentsByReservation.set(payment.reservation_id, payment);
        }
      });

      // Process data by family group
      const familySummaries: FamilySummary[] = [];
      let totalStays = 0;
      let totalNights = 0;
      let totalCharged = 0;
      let totalPaid = 0;

      for (const familyGroup of familyGroups || []) {
        const familyReservations = reservations?.filter(r => r.family_group === familyGroup.name) || [];
        
        let familyCharged = 0;
        let familyPaid = 0;
        let familyNights = 0;

        for (const reservation of familyReservations) {
          const payment = paymentsByReservation.get(reservation.id);
          const nights = calculateNights(reservation.start_date, reservation.end_date);

          // Calculate billing based on daily occupancy data
          let reservationCharge = 0;
          
          if (payment) {
            // Priority 1: Calculate from daily occupancy if available
            if (payment.daily_occupancy && Array.isArray(payment.daily_occupancy) && payment.daily_occupancy.length > 0) {
              const dailyOccupancy: Record<string, number> = {};
              payment.daily_occupancy.forEach((day: any) => {
                dailyOccupancy[day.date] = day.guests || 0;
              });

              const billing = BillingCalculator.calculateFromDailyOccupancy(
                {
                  method: financialSettings?.billing_method as any || 'per_person_per_night',
                  amount: financialSettings?.billing_amount || 0,
                  taxRate: financialSettings?.tax_rate,
                  cleaningFee: financialSettings?.cleaning_fee,
                  petFee: financialSettings?.pet_fee,
                  damageDeposit: financialSettings?.damage_deposit,
                },
                dailyOccupancy,
                {
                  startDate: parseDateOnly(reservation.start_date),
                  endDate: parseDateOnly(reservation.end_date),
                }
              );
              reservationCharge = billing.total + (payment.manual_adjustment_amount || 0);
            }
            // Priority 2: If locked, use stored amount
            else if (payment.billing_locked && payment.amount) {
              reservationCharge = payment.amount + (payment.manual_adjustment_amount || 0);
            }
            // Priority 3: If no occupancy data, show $0 (awaiting data)
            else {
              reservationCharge = 0;
            }
            
            familyCharged += reservationCharge;
            familyPaid += payment.amount_paid || 0;
          }

          familyNights += nights;
        }

        if (familyReservations.length > 0) {
          familySummaries.push({
            familyGroup: familyGroup.name,
            totalStays: familyReservations.length,
            totalNights: familyNights,
            totalCharged: familyCharged,
            totalPaid: familyPaid,
            outstandingBalance: familyCharged - familyPaid,
            leadEmail: familyGroup.lead_email || undefined,
            leadPhone: familyGroup.lead_phone || undefined,
          });

          totalStays += familyReservations.length;
          totalNights += familyNights;
          totalCharged += familyCharged;
          totalPaid += familyPaid;
        }
      }

      setSummary({
        config,
        familySummaries,
        totals: {
          totalFamilies: familySummaries.length,
          totalStays,
          totalNights,
          totalCharged,
          totalPaid,
          totalOutstanding: totalCharged - totalPaid,
        },
      });
    } catch (error) {
      console.error('Error fetching admin season summary:', error);
      toast({
        title: 'Error',
        description: 'Failed to load admin season summary',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminSeasonData();
  }, [organization?.id, year]);

  return {
    summary,
    loading,
    refetch: fetchAdminSeasonData,
  };
};
