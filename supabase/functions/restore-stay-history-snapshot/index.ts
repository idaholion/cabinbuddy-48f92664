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

type RestoreScope = 'full' | 'payments_only' | 'reservations_only';

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
      snapshot_file_path, 
      confirm_restore, 
      restore_scope = 'full' as RestoreScope 
    } = await req.json();
    
    if (!snapshot_file_path) {
      return new Response(
        JSON.stringify({ error: 'snapshot_file_path is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Starting restore for snapshot: ${snapshot_file_path}, scope: ${restore_scope}`);

    // Download the snapshot file
    const { data: snapshotFile, error: downloadError } = await supabase.storage
      .from('organization-backups')
      .download(snapshot_file_path);

    if (downloadError) {
      console.error('Error downloading snapshot:', downloadError);
      return new Response(
        JSON.stringify({ error: 'Failed to download snapshot file' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse snapshot data
    const snapshotText = await snapshotFile.text();
    const snapshotData: StayHistorySnapshot = JSON.parse(snapshotText);
    const orgId = snapshotData.metadata.organization_id;
    const seasonYear = snapshotData.metadata.season_year;

    console.log(`Parsed snapshot for ${snapshotData.metadata.organization_name}, year ${seasonYear}`);

    if (!confirm_restore) {
      // Return preview
      return new Response(
        JSON.stringify({
          preview: true,
          data: {
            organization: snapshotData.metadata.organization_name,
            season_year: seasonYear,
            snapshot_date: snapshotData.metadata.snapshot_date,
            snapshot_type: snapshotData.metadata.snapshot_type,
            summary: snapshotData.summary,
            restore_scope_options: ['full', 'payments_only', 'reservations_only']
          },
          message: 'This is a preview. Call again with confirm_restore: true to proceed.'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create a pre-restore snapshot first
    console.log('Creating pre-restore snapshot...');
    const yearStart = `${seasonYear}-01-01`;
    const yearEnd = `${seasonYear}-12-31`;

    // Fetch current data for pre-restore backup
    const { data: currentReservations } = await supabase
      .from('reservations')
      .select('*')
      .eq('organization_id', orgId)
      .gte('start_date', yearStart)
      .lte('start_date', yearEnd);

    const reservationIds = (currentReservations || []).map(r => r.id);

    let currentPayments: any[] = [];
    if (reservationIds.length > 0) {
      const { data } = await supabase
        .from('payments')
        .select('*')
        .eq('organization_id', orgId)
        .in('reservation_id', reservationIds);
      currentPayments = data || [];
    }

    // Also get payments by due_date
    const { data: yearPayments } = await supabase
      .from('payments')
      .select('*')
      .eq('organization_id', orgId)
      .gte('due_date', yearStart)
      .lte('due_date', yearEnd);

    if (yearPayments) {
      const existingIds = new Set(currentPayments.map(p => p.id));
      for (const p of yearPayments) {
        if (!existingIds.has(p.id)) {
          currentPayments.push(p);
        }
      }
    }

    const paymentIds = currentPayments.map(p => p.id);

    let currentSplits: any[] = [];
    if (paymentIds.length > 0) {
      const { data } = await supabase
        .from('payment_splits')
        .select('*')
        .eq('organization_id', orgId)
        .or(`source_payment_id.in.(${paymentIds.join(',')}),split_payment_id.in.(${paymentIds.join(',')})`);
      currentSplits = data || [];
    }

    const { data: currentCheckins } = await supabase
      .from('checkin_sessions')
      .select('*')
      .eq('organization_id', orgId)
      .gte('check_date', yearStart)
      .lte('check_date', yearEnd);

    const { data: currentReceipts } = await supabase
      .from('receipts')
      .select('*')
      .eq('organization_id', orgId)
      .gte('date', yearStart)
      .lte('date', yearEnd);

    // Save pre-restore snapshot
    const preRestoreSnapshot: StayHistorySnapshot = {
      metadata: {
        organization_id: orgId,
        organization_name: snapshotData.metadata.organization_name,
        season_year: seasonYear,
        snapshot_date: new Date().toISOString(),
        snapshot_type: 'pre_restore'
      },
      data: {
        reservations: currentReservations || [],
        payments: currentPayments,
        payment_splits: currentSplits,
        checkin_sessions: currentCheckins || [],
        receipts: currentReceipts || []
      },
      summary: {
        total_reservations: (currentReservations || []).length,
        total_payments: currentPayments.length,
        total_payment_splits: currentSplits.length,
        total_checkin_sessions: (currentCheckins || []).length,
        total_receipts: (currentReceipts || []).length,
        total_amount_billed: currentPayments.reduce((sum, p) => sum + (p.amount || 0), 0),
        total_amount_paid: currentPayments.reduce((sum, p) => sum + (p.amount_paid || 0), 0)
      }
    };

    const preRestoreFileName = `${orgId}/pre_restore_stay_history_${seasonYear}_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    
    await supabase.storage
      .from('organization-backups')
      .upload(preRestoreFileName, JSON.stringify(preRestoreSnapshot, null, 2));

    // Now perform the restore based on scope
    let restoredCounts: Record<string, number> = {};

    if (restore_scope === 'full' || restore_scope === 'payments_only') {
      // Delete existing payment splits first (they reference payments)
      if (paymentIds.length > 0) {
        const { error: splitDeleteError } = await supabase
          .from('payment_splits')
          .delete()
          .eq('organization_id', orgId)
          .or(`source_payment_id.in.(${paymentIds.join(',')}),split_payment_id.in.(${paymentIds.join(',')})`);
        
        if (splitDeleteError) {
          console.error('Error deleting payment splits:', splitDeleteError);
        }
      }

      // Delete existing payments
      if (paymentIds.length > 0) {
        const { error: paymentDeleteError } = await supabase
          .from('payments')
          .delete()
          .in('id', paymentIds);
        
        if (paymentDeleteError) {
          console.error('Error deleting payments:', paymentDeleteError);
        }
      }

      // Restore payments
      if (snapshotData.data.payments && snapshotData.data.payments.length > 0) {
        const { error: paymentInsertError } = await supabase
          .from('payments')
          .insert(snapshotData.data.payments);
        
        if (paymentInsertError) {
          console.error('Error restoring payments:', paymentInsertError);
        } else {
          restoredCounts.payments = snapshotData.data.payments.length;
        }
      }

      // Restore payment splits
      if (snapshotData.data.payment_splits && snapshotData.data.payment_splits.length > 0) {
        const { error: splitInsertError } = await supabase
          .from('payment_splits')
          .insert(snapshotData.data.payment_splits);
        
        if (splitInsertError) {
          console.error('Error restoring payment splits:', splitInsertError);
        } else {
          restoredCounts.payment_splits = snapshotData.data.payment_splits.length;
        }
      }
    }

    if (restore_scope === 'full' || restore_scope === 'reservations_only') {
      // Delete existing reservations for the year
      if (reservationIds.length > 0) {
        const { error: resDeleteError } = await supabase
          .from('reservations')
          .delete()
          .in('id', reservationIds);
        
        if (resDeleteError) {
          console.error('Error deleting reservations:', resDeleteError);
        }
      }

      // Restore reservations
      if (snapshotData.data.reservations && snapshotData.data.reservations.length > 0) {
        const { error: resInsertError } = await supabase
          .from('reservations')
          .insert(snapshotData.data.reservations);
        
        if (resInsertError) {
          console.error('Error restoring reservations:', resInsertError);
        } else {
          restoredCounts.reservations = snapshotData.data.reservations.length;
        }
      }
    }

    if (restore_scope === 'full') {
      // Delete and restore checkin_sessions
      const { error: checkinDeleteError } = await supabase
        .from('checkin_sessions')
        .delete()
        .eq('organization_id', orgId)
        .gte('check_date', yearStart)
        .lte('check_date', yearEnd);

      if (checkinDeleteError) {
        console.error('Error deleting checkin sessions:', checkinDeleteError);
      }

      if (snapshotData.data.checkin_sessions && snapshotData.data.checkin_sessions.length > 0) {
        const { error: checkinInsertError } = await supabase
          .from('checkin_sessions')
          .insert(snapshotData.data.checkin_sessions);
        
        if (checkinInsertError) {
          console.error('Error restoring checkin sessions:', checkinInsertError);
        } else {
          restoredCounts.checkin_sessions = snapshotData.data.checkin_sessions.length;
        }
      }

      // Delete and restore receipts
      const { error: receiptsDeleteError } = await supabase
        .from('receipts')
        .delete()
        .eq('organization_id', orgId)
        .gte('date', yearStart)
        .lte('date', yearEnd);

      if (receiptsDeleteError) {
        console.error('Error deleting receipts:', receiptsDeleteError);
      }

      if (snapshotData.data.receipts && snapshotData.data.receipts.length > 0) {
        const { error: receiptsInsertError } = await supabase
          .from('receipts')
          .insert(snapshotData.data.receipts);
        
        if (receiptsInsertError) {
          console.error('Error restoring receipts:', receiptsInsertError);
        } else {
          restoredCounts.receipts = snapshotData.data.receipts.length;
        }
      }
    }

    // Log the restore operation
    await supabase
      .from('backup_metadata')
      .insert({
        organization_id: orgId,
        backup_type: `restore_stay_history_${seasonYear}`,
        file_path: snapshot_file_path,
        status: 'completed'
      });

    console.log('Restore completed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Stay history restored successfully',
        restore_scope,
        restored_from: {
          snapshot_date: snapshotData.metadata.snapshot_date,
          season_year: seasonYear
        },
        restored_counts: restoredCounts,
        pre_restore_snapshot: preRestoreFileName
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Restore function error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
