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
  receiptCredits: number;
  carriedInCredit: number;
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
    totalPaid: number;
    totalCharged: number;
    totalReceiptCredits: number;
    totalCarriedInCredit: number;
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

      const seasonStartStr = config.startDate.toISOString().split('T')[0];
      const seasonEndStr = config.endDate.toISOString().split('T')[0];

      // Fetch ALL reservations (not just this season) so prior-year balances /
      // credits can be carried into the season summary.
      const { data: allReservations, error: reservationsError } = await supabase
        .from('reservations')
        .select('*')
        .eq('organization_id', organization.id);

      if (reservationsError) throw reservationsError;

      // Fetch all payments for the season
      const { data: payments, error: paymentsError } = await supabase
        .from('payments')
        .select('*')
        .eq('organization_id', organization.id)
        .not('reservation_id', 'is', null);

      if (paymentsError) throw paymentsError;

      // Reimbursable receipts count as credit against what a family owes
      const { data: allReceipts, error: receiptsError } = await supabase
        .from('receipts')
        .select('family_group, amount, date')
        .eq('organization_id', organization.id);

      if (receiptsError) throw receiptsError;

      // Guest cost splits: the recipient's share lives in its own payment row,
      // which may point at the source family's reservation (or at nothing).
      const { data: splitRows, error: splitsError } = await supabase
        .from('payment_splits')
        .select('id, split_payment_id, source_payment_id, split_to_family_group')
        .eq('organization_id', organization.id);

      if (splitsError) throw splitsError;

      // All payments (including split rows with no reservation) for split lookup
      const { data: allPayments, error: allPaymentsError } = await supabase
        .from('payments')
        .select('*')
        .eq('organization_id', organization.id);

      if (allPaymentsError) throw allPaymentsError;

      const paymentsById = new Map<string, any>();
      allPayments?.forEach(p => paymentsById.set(p.id, p));

      const reservationsById = new Map<string, any>();
      (allReservations || []).forEach(r => reservationsById.set(r.id, r));

      const splitPaymentIds = new Set<string>(
        (splitRows || []).map(s => s.split_payment_id).filter(Boolean) as string[]
      );

      // A split stay: who owes it, when it happened, charged & paid amounts
      interface SplitStay {
        familyGroup: string;
        date: string;
        charged: number;
        paid: number;
      }

      const splitStays: SplitStay[] = [];
      for (const split of splitRows || []) {
        const splitPayment = paymentsById.get(split.split_payment_id);
        if (!splitPayment) continue;

        const sourcePayment = split.source_payment_id
          ? paymentsById.get(split.source_payment_id)
          : null;
        const reservation =
          (splitPayment.reservation_id && reservationsById.get(splitPayment.reservation_id)) ||
          (sourcePayment?.reservation_id && reservationsById.get(sourcePayment.reservation_id)) ||
          null;

        const date: string | null =
          reservation?.end_date ||
          (splitPayment.created_at ? String(splitPayment.created_at).split('T')[0] : null);
        if (!date) continue;

        splitStays.push({
          familyGroup: split.split_to_family_group,
          date,
          charged: Number(splitPayment.amount || 0),
          paid: Number(splitPayment.amount_paid || 0),
        });
      }

      // Create payment lookup map (split payments are handled separately so they
      // never overwrite the source family's own payment for the same reservation)
      const paymentsByReservation = new Map<string, any>();
      payments?.forEach(payment => {
        if (payment.reservation_id && !splitPaymentIds.has(payment.id)) {
          paymentsByReservation.set(payment.reservation_id, payment);
        }
      });

      const chargeForReservation = (reservation: any, payment: any): number => {
        if (!payment) return 0;
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
          return billing.total + (payment.manual_adjustment_amount || 0);
        }
        // Priority 2: If locked, use stored amount
        if (payment.billing_locked && payment.amount) {
          return payment.amount + (payment.manual_adjustment_amount || 0);
        }
        // Priority 3: No occupancy data yet
        return 0;
      };

      const round2 = (n: number) => Math.round(n * 100) / 100;

      // Process data by family group
      const familySummaries: FamilySummary[] = [];
      let totalStays = 0;
      let totalNights = 0;
      let totalCharged = 0;
      let totalPaid = 0;
      let totalReceiptCredits = 0;
      let totalCarriedInCredit = 0;
      let totalOutstanding = 0;

      for (const familyGroup of familyGroups || []) {
        const familyAll = (allReservations || []).filter(r => r.family_group === familyGroup.name);
        const familyReservations = familyAll.filter(
          r => r.start_date >= seasonStartStr && r.end_date <= seasonEndStr
        );
        const priorReservations = familyAll.filter(r => r.end_date < seasonStartStr);

        const familyReceiptsAll = (allReceipts || []).filter(rc => rc.family_group === familyGroup.name);
        const seasonReceipts = familyReceiptsAll
          .filter(rc => rc.date >= seasonStartStr && rc.date <= seasonEndStr)
          .reduce((sum, rc) => sum + Number(rc.amount || 0), 0);
        const priorReceipts = familyReceiptsAll
          .filter(rc => rc.date < seasonStartStr)
          .reduce((sum, rc) => sum + Number(rc.amount || 0), 0);

        let familyCharged = 0;
        let familyPaid = 0;
        let familyNights = 0;

        for (const reservation of familyReservations) {
          const payment = paymentsByReservation.get(reservation.id);
          familyCharged += chargeForReservation(reservation, payment);
          familyPaid += payment?.amount_paid || 0;
          familyNights += calculateNights(reservation.start_date, reservation.end_date);
        }

        let priorCharged = 0;
        let priorPaid = 0;
        for (const reservation of priorReservations) {
          const payment = paymentsByReservation.get(reservation.id);
          priorCharged += chargeForReservation(reservation, payment);
          priorPaid += payment?.amount_paid || 0;
        }

        // Positive = still owed from earlier years, negative = credit carried in
        const priorBalance = round2(priorCharged - priorPaid - priorReceipts);
        const outstandingBalance = round2(
          priorBalance + familyCharged - familyPaid - seasonReceipts
        );

        const hasActivity =
          familyReservations.length > 0 ||
          Math.abs(priorBalance) > 0.004 ||
          seasonReceipts > 0;

        if (hasActivity) {
          familySummaries.push({
            familyGroup: familyGroup.name,
            totalStays: familyReservations.length,
            totalNights: familyNights,
            totalCharged: round2(familyCharged),
            totalPaid: round2(familyPaid),
            receiptCredits: round2(seasonReceipts),
            carriedInCredit: round2(-priorBalance),
            outstandingBalance,
            leadEmail: familyGroup.lead_email || undefined,
            leadPhone: familyGroup.lead_phone || undefined,
          });

          totalStays += familyReservations.length;
          totalNights += familyNights;
          totalCharged += familyCharged;
          totalPaid += familyPaid;
          totalReceiptCredits += seasonReceipts;
          totalCarriedInCredit += -priorBalance;
          totalOutstanding += outstandingBalance;
        }
      }

      setSummary({
        config,
        familySummaries,
        totals: {
          totalFamilies: familySummaries.length,
          totalStays,
          totalNights,
          totalCharged: round2(totalCharged),
          totalPaid: round2(totalPaid),
          totalReceiptCredits: round2(totalReceiptCredits),
          totalCarriedInCredit: round2(totalCarriedInCredit),
          totalOutstanding: round2(totalOutstanding),
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
