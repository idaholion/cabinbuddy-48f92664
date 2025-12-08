import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UpdateSplitOccupancyRequest {
  splitId: string;
  sourceOccupancy: { [date: string]: number };
  recipientOccupancy: { [date: string]: number };
  perDiem: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get the current user
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { splitId, sourceOccupancy, recipientOccupancy, perDiem }: UpdateSplitOccupancyRequest = await req.json();

    console.log('[UPDATE-SPLIT] Request:', { splitId, sourceOccupancy, recipientOccupancy, perDiem });

    // Fetch the split record
    const { data: split, error: splitError } = await supabaseClient
      .from('payment_splits')
      .select('*')
      .eq('id', splitId)
      .single();

    if (splitError || !split) {
      throw new Error('Split not found');
    }

    console.log('[UPDATE-SPLIT] Found split:', split);

    // Check permissions: user must be source user or admin
    const { data: userOrg, error: userOrgError } = await supabaseClient
      .from('user_organizations')
      .select('role')
      .eq('user_id', user.id)
      .eq('organization_id', split.organization_id)
      .single();

    const isAdmin = userOrg?.role === 'admin' || userOrg?.role === 'calendar_keeper';
    const isSourceUser = split.source_user_id === user.id;

    if (!isAdmin && !isSourceUser) {
      throw new Error('Permission denied. Only the source user or admin can edit splits.');
    }

    console.log('[UPDATE-SPLIT] Permission check passed:', { isAdmin, isSourceUser });

    // Check if recipient has made any payments
    const { data: splitPayment } = await supabaseClient
      .from('payments')
      .select('amount_paid')
      .eq('id', split.split_payment_id)
      .single();

    if (splitPayment && splitPayment.amount_paid > 0) {
      throw new Error('Cannot edit split after recipient has made payments');
    }

    // Build new daily occupancy split for the split record and recipient payment
    // NOTE: This only updates the recipient's payment, NOT the source payment (Option A behavior)
    const dates = Object.keys(sourceOccupancy).sort();
    const newDailyOccupancySplit = [];
    const newRecipientDailyOccupancy = [];

    for (const date of dates) {
      const sourceGuests = sourceOccupancy[date] || 0;
      const recipientGuests = recipientOccupancy[date] || 0;
      const recipientCost = recipientGuests * perDiem;

      // For payment_splits table (keeps both source and recipient info for reference)
      newDailyOccupancySplit.push({
        date,
        sourceGuests,
        recipientGuests,
        perDiem,
        recipientCost,
      });

      // For recipient's payment.daily_occupancy
      newRecipientDailyOccupancy.push({
        date,
        guests: recipientGuests,
        cost: recipientCost,
      });
    }

    // Calculate new recipient total only
    const newSplitAmount = newDailyOccupancySplit.reduce((sum, day) => sum + day.recipientCost, 0);

    console.log('[UPDATE-SPLIT] Calculated recipient amount:', { newSplitAmount });

    // Update the split record
    const { error: updateSplitError } = await supabaseClient
      .from('payment_splits')
      .update({
        daily_occupancy_split: newDailyOccupancySplit,
        updated_at: new Date().toISOString(),
      })
      .eq('id', splitId);

    if (updateSplitError) throw updateSplitError;

    // Update the split (recipient) payment ONLY - source payment remains unchanged
    const { error: updateSplitPaymentError } = await supabaseClient
      .from('payments')
      .update({
        amount: newSplitAmount,
        balance_due: newSplitAmount,
        daily_occupancy: newRecipientDailyOccupancy,
        updated_at: new Date().toISOString(),
      })
      .eq('id', split.split_payment_id);

    if (updateSplitPaymentError) throw updateSplitPaymentError;

    console.log('[UPDATE-SPLIT] Successfully updated all records');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Split occupancy updated successfully (recipient only)',
        newSplitAmount,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('[UPDATE-SPLIT] Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
