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

      console.log('🔍 [ADMIN_SEASON_SUMMARY] Reservations fetched:', {
        count: reservations?.length,
        dateRange: `${config.startDate.toISOString().split('T')[0]} to ${config.endDate.toISOString().split('T')[0]}`,
        sample: reservations?.slice(0, 2)
      });

      // Fetch all payments for the season
      const { data: payments, error: paymentsError } = await supabase
        .from('payments')
        .select('*')
        .eq('organization_id', organization.id)
        .not('reservation_id', 'is', null);

      if (paymentsError) throw paymentsError;

      console.log('🔍 [ADMIN_SEASON_SUMMARY] Payments fetched:', {
        count: payments?.length,
        sample: payments?.slice(0, 2)
      });

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

          console.log(`🔍 [ADMIN_SEASON_SUMMARY] Processing ${familyGroup.name}:`, {
            reservationId: reservation.id,
            dates: `${reservation.start_date} to ${reservation.end_date}`,
            hasPayment: !!payment,
            paymentAmount: payment?.amount,
            paymentPaid: payment?.amount_paid
          });

          // Use payment amount if available, otherwise calculate
          if (payment?.amount) {
            familyCharged += payment.amount + (payment.manual_adjustment_amount || 0);
            familyPaid += payment.amount_paid || 0;
          } else {
            // Fallback calculation if no payment exists
            familyCharged += 0; // Will be calculated when payment is created
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
