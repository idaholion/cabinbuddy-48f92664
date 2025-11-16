import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Get the current user for authorization
    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      const userClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        {
          global: {
            headers: { Authorization: authHeader },
          },
        }
      );

      const { data: { user }, error: userError } = await userClient.auth.getUser();
      
      if (userError || !user) {
        throw new Error('Unauthorized');
      }

      // Check if user is admin
      const { data: userOrg, error: userOrgError } = await supabaseClient
        .from('user_organizations')
        .select('role')
        .eq('user_id', user.id)
        .single();

      if (userOrgError || !userOrg || userOrg.role !== 'admin') {
        throw new Error('Unauthorized: Admin access required');
      }
    }

    console.log('[BACKFILL-SPLIT] Starting backfill of split payment occupancy data');

    // Fetch all active payment splits
    const { data: splits, error: splitsError } = await supabaseClient
      .from('payment_splits')
      .select('*')
      .eq('status', 'active');

    if (splitsError) {
      throw splitsError;
    }

    console.log(`[BACKFILL-SPLIT] Found ${splits?.length || 0} active splits to process`);

    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    for (const split of splits || []) {
      try {
        const dailySplit = split.daily_occupancy_split as any[];
        
        if (!dailySplit || dailySplit.length === 0) {
          console.log(`[BACKFILL-SPLIT] Skipping split ${split.id} - no daily_occupancy_split data`);
          continue;
        }

        // Get the source payment to determine original occupancy
        const { data: sourcePayment, error: sourceError } = await supabaseClient
          .from('payments')
          .select('daily_occupancy')
          .eq('id', split.source_payment_id)
          .single();

        if (sourceError || !sourcePayment) {
          console.log(`[BACKFILL-SPLIT] Skipping split ${split.id} - source payment not found`);
          continue;
        }

        // Build recipient and source daily occupancy arrays
        const recipientDailyOccupancy = [];
        const sourceDailyOccupancy = [];

        for (const day of dailySplit) {
          // Handle both old and new data formats
          const recipientGuests = day.recipientGuests || day.guests || 0;
          const recipientCost = day.recipientCost || day.cost || 0;
          const perDiem = day.perDiem || (recipientGuests > 0 ? recipientCost / recipientGuests : 0);

          // Find original occupancy for this date from source payment
          const sourceDay = (sourcePayment.daily_occupancy as any[])?.find(d => d.date === day.date);
          const originalGuests = sourceDay?.guests || 0;
          
          // Source keeps what's left after split
          const sourceGuests = Math.max(0, originalGuests - recipientGuests);
          const sourceCost = sourceGuests * perDiem;

          recipientDailyOccupancy.push({
            date: day.date,
            guests: recipientGuests,
            cost: recipientCost,
          });

          sourceDailyOccupancy.push({
            date: day.date,
            guests: sourceGuests,
            cost: sourceCost,
          });
        }

        // Update recipient payment
        const { error: recipientError } = await supabaseClient
          .from('payments')
          .update({
            daily_occupancy: recipientDailyOccupancy,
            updated_at: new Date().toISOString(),
          })
          .eq('id', split.split_payment_id);

        if (recipientError) {
          throw new Error(`Failed to update recipient payment: ${recipientError.message}`);
        }

        // Update source payment
        const { error: sourceError } = await supabaseClient
          .from('payments')
          .update({
            daily_occupancy: sourceDailyOccupancy,
            updated_at: new Date().toISOString(),
          })
          .eq('id', split.source_payment_id);

        if (sourceError) {
          throw new Error(`Failed to update source payment: ${sourceError.message}`);
        }

        console.log(`[BACKFILL-SPLIT] Successfully updated split ${split.id}`);
        successCount++;
      } catch (error: any) {
        console.error(`[BACKFILL-SPLIT] Error processing split ${split.id}:`, error);
        errorCount++;
        errors.push({
          splitId: split.id,
          error: error.message,
        });
      }
    }

    console.log(`[BACKFILL-SPLIT] Backfill complete: ${successCount} successful, ${errorCount} errors`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Backfill complete',
        processed: splits?.length || 0,
        successful: successCount,
        errors: errorCount,
        errorDetails: errors,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('[BACKFILL-SPLIT] Fatal error:', error);
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
