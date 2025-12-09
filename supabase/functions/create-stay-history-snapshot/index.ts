import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface StayHistorySnapshot {
  metadata: {
    organization_id: string;
    organization_name: string;
    season_year: number;
    snapshot_date: string;
    snapshot_type: string;
    snapshot_source: 'manual' | 'auto';
    created_by_user_id?: string;
  };
  data: {
    reservations: any[];
    payments: any[];
    payment_splits: any[];
    checkin_sessions: any[];
    receipts: any[];
  };
  summary: {
    total_reservations: number;
    total_payments: number;
    total_payment_splits: number;
    total_checkin_sessions: number;
    total_receipts: number;
    total_amount_billed: number;
    total_amount_paid: number;
  };
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { 
      organization_id, 
      season_year, 
      snapshot_type = 'manual', 
      snapshot_source = 'manual',
      created_by_user_id 
    } = await req.json();
    
    if (!organization_id) {
      return new Response(
        JSON.stringify({ error: 'organization_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!season_year) {
      return new Response(
        JSON.stringify({ error: 'season_year is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Creating stay history snapshot for org ${organization_id}, year ${season_year}, source: ${snapshot_source}`);

    // Get organization info
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('name')
      .eq('id', organization_id)
      .single();

    if (orgError || !org) {
      return new Response(
        JSON.stringify({ error: 'Organization not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Define date range for the season year
    const yearStart = `${season_year}-01-01`;
    const yearEnd = `${season_year}-12-31`;

    // Fetch reservations for the year
    const { data: reservations, error: resError } = await supabase
      .from('reservations')
      .select('*')
      .eq('organization_id', organization_id)
      .gte('start_date', yearStart)
      .lte('start_date', yearEnd);

    if (resError) {
      console.error('Error fetching reservations:', resError);
      throw resError;
    }

    // Get reservation IDs for filtering payments
    const reservationIds = (reservations || []).map(r => r.id);

    // Fetch payments for these reservations
    let payments: any[] = [];
    if (reservationIds.length > 0) {
      const { data: paymentData, error: payError } = await supabase
        .from('payments')
        .select('*')
        .eq('organization_id', organization_id)
        .in('reservation_id', reservationIds);
      
      if (payError) {
        console.error('Error fetching payments:', payError);
      } else {
        payments = paymentData || [];
      }
    }

    // Also get payments by due_date for the year (in case reservation_id is null)
    const { data: yearPayments, error: yearPayError } = await supabase
      .from('payments')
      .select('*')
      .eq('organization_id', organization_id)
      .gte('due_date', yearStart)
      .lte('due_date', yearEnd);

    if (!yearPayError && yearPayments) {
      // Merge without duplicates
      const existingIds = new Set(payments.map(p => p.id));
      for (const p of yearPayments) {
        if (!existingIds.has(p.id)) {
          payments.push(p);
        }
      }
    }

    // Get payment IDs for fetching splits
    const paymentIds = payments.map(p => p.id);

    // Fetch payment splits
    let paymentSplits: any[] = [];
    if (paymentIds.length > 0) {
      const { data: splitData, error: splitError } = await supabase
        .from('payment_splits')
        .select('*')
        .eq('organization_id', organization_id)
        .or(`source_payment_id.in.(${paymentIds.join(',')}),split_payment_id.in.(${paymentIds.join(',')})`);
      
      if (splitError) {
        console.error('Error fetching payment splits:', splitError);
      } else {
        paymentSplits = splitData || [];
      }
    }

    // Fetch checkin sessions for the year
    const { data: checkinSessions, error: checkinError } = await supabase
      .from('checkin_sessions')
      .select('*')
      .eq('organization_id', organization_id)
      .gte('check_date', yearStart)
      .lte('check_date', yearEnd);

    if (checkinError) {
      console.error('Error fetching checkin sessions:', checkinError);
    }

    // Fetch receipts for the year
    const { data: receipts, error: receiptsError } = await supabase
      .from('receipts')
      .select('*')
      .eq('organization_id', organization_id)
      .gte('date', yearStart)
      .lte('date', yearEnd);

    if (receiptsError) {
      console.error('Error fetching receipts:', receiptsError);
    }

    // Calculate summary
    const totalBilled = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const totalPaid = payments.reduce((sum, p) => sum + (p.amount_paid || 0), 0);

    // Create snapshot data
    const snapshotData: StayHistorySnapshot = {
      metadata: {
        organization_id,
        organization_name: org.name,
        season_year,
        snapshot_date: new Date().toISOString(),
        snapshot_type,
        snapshot_source,
        created_by_user_id
      },
      data: {
        reservations: reservations || [],
        payments: payments,
        payment_splits: paymentSplits,
        checkin_sessions: checkinSessions || [],
        receipts: receipts || []
      },
      summary: {
        total_reservations: (reservations || []).length,
        total_payments: payments.length,
        total_payment_splits: paymentSplits.length,
        total_checkin_sessions: (checkinSessions || []).length,
        total_receipts: (receipts || []).length,
        total_amount_billed: totalBilled,
        total_amount_paid: totalPaid
      }
    };

    // Create filename with source prefix for easier identification
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const sourcePrefix = snapshot_source === 'auto' ? 'auto_' : '';
    const fileName = `${organization_id}/${sourcePrefix}stay_history_${season_year}_${timestamp}.json`;

    // Convert to JSON
    const snapshotJson = JSON.stringify(snapshotData, null, 2);
    const fileSize = new Blob([snapshotJson]).size;

    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from('organization-backups')
      .upload(fileName, snapshotJson, {
        contentType: 'application/json',
        upsert: false
      });

    if (uploadError) {
      console.error('Failed to upload snapshot:', uploadError);
      return new Response(
        JSON.stringify({ error: 'Failed to save snapshot' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create metadata record with snapshot_source and season_year
    const { error: metadataError } = await supabase
      .from('backup_metadata')
      .insert({
        organization_id,
        backup_type: `stay_history_${season_year}`,
        file_path: fileName,
        file_size: fileSize,
        status: 'completed',
        created_by_user_id,
        snapshot_source,
        season_year
      });

    if (metadataError) {
      console.error('Failed to create metadata:', metadataError);
    }

    console.log(`Stay history snapshot created: ${fileName} (source: ${snapshot_source})`);

    return new Response(
      JSON.stringify({
        success: true,
        file_path: fileName,
        file_size: fileSize,
        snapshot_source,
        summary: snapshotData.summary
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Snapshot function error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
