import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface BillingConfig {
  method: string;
  amount: number;
  cleaningFee?: number;
  taxRate?: number;
}

interface StayDetails {
  nights: number;
  guests: number;
  checkInDate: Date;
  checkOutDate: Date;
}

class BillingCalculator {
  static calculateStayBilling(config: BillingConfig, stay: StayDetails) {
    const baseAmount = this.calculateBaseAmount(config, stay);
    const cleaningFee = config.cleaningFee || 0;
    const subtotal = baseAmount + cleaningFee;
    const tax = config.taxRate ? (subtotal * config.taxRate) / 100 : 0;
    const total = subtotal + tax;
    
    return {
      baseAmount,
      cleaningFee,
      subtotal,
      tax,
      total,
    };
  }
  
  private static calculateBaseAmount(config: BillingConfig, stay: StayDetails): number {
    const normalizedMethod = config.method?.toLowerCase().replace(/_/g, '-').replace('night', 'day');
    
    switch (normalizedMethod) {
      case 'per-person-per-day':
        return stay.guests * stay.nights * config.amount;
      case 'flat-rate-per-day':
        return stay.nights * config.amount;
      default:
        return stay.guests * stay.nights * config.amount;
    }
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization')!;
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('Auth error:', userError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { organizationId, year } = await req.json();

    if (!organizationId || !year) {
      return new Response(JSON.stringify({ error: 'Missing organizationId or year' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Starting sync for organization ${organizationId}, year ${year}`);

    // Verify user is admin for this organization
    const { data: userOrg, error: userOrgError } = await supabase
      .from('user_organizations')
      .select('role')
      .eq('user_id', user.id)
      .eq('organization_id', organizationId)
      .single();

    if (userOrgError || !userOrg || userOrg.role !== 'admin') {
      console.error('Permission denied - not an admin:', userOrgError);
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get season configuration
    const { data: configData, error: configError } = await supabase
      .from('reservation_settings')
      .select('*')
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (configError) {
      console.error('Config error:', configError);
      throw configError;
    }

    if (!configData) {
      return new Response(JSON.stringify({ error: 'No season configuration found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const startDate = new Date(year, configData.season_start_month - 1, configData.season_start_day);
    const endDate = new Date(year, configData.season_end_month - 1, configData.season_end_day);

    console.log(`Season dates: ${startDate.toISOString()} to ${endDate.toISOString()}`);

    // Fetch all reservations in season
    const { data: reservations, error: reservationsError } = await supabase
      .from('reservations')
      .select('*')
      .eq('organization_id', organizationId)
      .gte('start_date', startDate.toISOString())
      .lte('end_date', endDate.toISOString());

    if (reservationsError) {
      console.error('Reservations error:', reservationsError);
      throw reservationsError;
    }

    console.log(`Found ${reservations?.length || 0} reservations`);

    // Fetch existing payments
    const { data: existingPayments } = await supabase
      .from('payments')
      .select('reservation_id')
      .eq('organization_id', organizationId)
      .not('reservation_id', 'is', null);

    const existingReservationIds = new Set(
      existingPayments?.map(p => p.reservation_id) || []
    );

    console.log(`Found ${existingPayments?.length || 0} existing payment records`);

    let created = 0;
    const errors: string[] = [];
    const paymentRecords = [];

    // Create payments for reservations without them
    // ONLY if they already have occupancy data from check-ins
    for (const reservation of reservations || []) {
      if (existingReservationIds.has(reservation.id)) {
        continue;
      }

      try {
        // Check if there's existing occupancy data from checkin_sessions
        const { data: checkinData, error: checkinError } = await supabase
          .from('checkin_sessions')
          .select('daily_occupancy')
          .eq('organization_id', organizationId)
          .eq('family_group', reservation.family_group)
          .gte('check_date', reservation.start_date)
          .lt('check_date', reservation.end_date)
          .order('check_date');
        
        if (checkinError) {
          console.error(`Error fetching checkin data for reservation ${reservation.id}:`, checkinError);
          continue;
        }
        
        // Skip if no occupancy data exists - user needs to enter it via "Edit Occupancy"
        if (!checkinData || checkinData.length === 0) {
          console.log(`Skipping reservation ${reservation.id} - no occupancy data yet`);
          continue;
        }
        
        // Build daily occupancy from checkin sessions
        const dailyOccupancy = checkinData.map((session: any) => ({
          date: session.check_date,
          guests: session.guest_count || 0,
          cost: 0, // Will be calculated below
        }));
        
        // Calculate billing using organization settings and actual occupancy
        const billingConfig: BillingConfig = {
          method: configData.financial_method || 'per-person-per-day',
          amount: configData.nightly_rate || 0,
          cleaningFee: configData.cleaning_fee || 0,
          taxRate: configData.tax_rate || 0,
        };
        
        // Calculate costs for each day
        let totalCost = 0;
        for (const day of dailyOccupancy) {
          const dayCost = day.guests * billingConfig.amount;
          day.cost = dayCost;
          totalCost += dayCost;
        }

        paymentRecords.push({
          organization_id: organizationId,
          reservation_id: reservation.id,
          family_group: reservation.family_group,
          amount: totalCost,
          amount_paid: 0,
          status: 'pending',
          payment_type: 'use_fee',
          description: `Use fee - ${reservation.start_date} to ${reservation.end_date}`,
          daily_occupancy: dailyOccupancy,
          created_by_user_id: user.id,
        });

        created++;
      } catch (error) {
        console.error(`Error processing reservation ${reservation.id}:`, error);
        errors.push(`Reservation ${reservation.id}: ${error.message}`);
      }
    }

    // Batch insert all payment records
    if (paymentRecords.length > 0) {
      const { error: insertError } = await supabase
        .from('payments')
        .insert(paymentRecords);

      if (insertError) {
        console.error('Insert error:', insertError);
        throw insertError;
      }
    }

    console.log(`Successfully created ${created} payment records`);

    return new Response(
      JSON.stringify({
        success: true,
        created,
        existing: existingPayments?.length || 0,
        total: reservations?.length || 0,
        errors,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Function error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
