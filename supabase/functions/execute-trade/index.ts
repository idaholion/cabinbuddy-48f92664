import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ExecuteTradeRequest {
  tradeRequestId: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tradeRequestId }: ExecuteTradeRequest = await req.json();
    
    console.log(`Executing trade for request: ${tradeRequestId}`);

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get trade request details
    const { data: tradeRequest, error: tradeError } = await supabaseClient
      .from('trade_requests')
      .select('*')
      .eq('id', tradeRequestId)
      .single();

    if (tradeError || !tradeRequest) {
      console.error('Error fetching trade request:', tradeError);
      throw new Error('Trade request not found');
    }

    // Check if already executed
    if (tradeRequest.execution_status === 'completed') {
      console.log('Trade already executed');
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Trade already executed',
        alreadyExecuted: true
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Check trade is approved
    if (tradeRequest.status !== 'approved') {
      throw new Error('Trade request must be approved before execution');
    }

    // Find the target's reservation that matches the requested dates
    const { data: targetReservation, error: targetResError } = await supabaseClient
      .from('reservations')
      .select('*')
      .eq('organization_id', tradeRequest.organization_id)
      .eq('family_group', tradeRequest.target_family_group)
      .lte('start_date', tradeRequest.requested_end_date)
      .gte('end_date', tradeRequest.requested_start_date)
      .single();

    if (targetResError || !targetReservation) {
      console.error('Target reservation not found:', targetResError);
      
      // Update trade request with failure status
      await supabaseClient
        .from('trade_requests')
        .update({
          execution_status: 'failed',
          execution_notes: 'Target reservation not found. It may have been modified or deleted.',
          executed_at: new Date().toISOString()
        })
        .eq('id', tradeRequestId);

      throw new Error('Target reservation not found. The reservation may have been modified or deleted.');
    }

    console.log('Found target reservation:', targetReservation.id);

    // Start transaction-like operations
    let executionNotes = '';

    // Transfer the target's reservation to the requester
    const { error: transferError } = await supabaseClient
      .from('reservations')
      .update({
        family_group: tradeRequest.requester_family_group,
        host_assignments: [], // Clear host assignments - requester can set their own
        notes: `Traded from ${tradeRequest.target_family_group} on ${new Date().toLocaleDateString()}`
      })
      .eq('id', targetReservation.id);

    if (transferError) {
      console.error('Error transferring target reservation:', transferError);
      
      await supabaseClient
        .from('trade_requests')
        .update({
          execution_status: 'failed',
          execution_notes: `Failed to transfer reservation: ${transferError.message}`,
          executed_at: new Date().toISOString()
        })
        .eq('id', tradeRequestId);

      throw new Error('Failed to transfer reservation');
    }

    executionNotes = `Transferred ${tradeRequest.target_family_group}'s reservation (${tradeRequest.requested_start_date} to ${tradeRequest.requested_end_date}) to ${tradeRequest.requester_family_group}`;

    // If this is a trade offer, also transfer the offered reservation
    if (tradeRequest.request_type === 'trade_offer' && tradeRequest.offered_start_date) {
      const { data: offeredReservation, error: offeredResError } = await supabaseClient
        .from('reservations')
        .select('*')
        .eq('organization_id', tradeRequest.organization_id)
        .eq('family_group', tradeRequest.requester_family_group)
        .lte('start_date', tradeRequest.offered_end_date)
        .gte('end_date', tradeRequest.offered_start_date)
        .single();

      if (offeredReservation) {
        const { error: offerTransferError } = await supabaseClient
          .from('reservations')
          .update({
            family_group: tradeRequest.target_family_group,
            host_assignments: [],
            notes: `Traded from ${tradeRequest.requester_family_group} on ${new Date().toLocaleDateString()}`
          })
          .eq('id', offeredReservation.id);

        if (offerTransferError) {
          console.error('Error transferring offered reservation:', offerTransferError);
          executionNotes += `. Warning: Failed to transfer offered reservation back to ${tradeRequest.target_family_group}`;
        } else {
          executionNotes += `. Also transferred ${tradeRequest.requester_family_group}'s reservation (${tradeRequest.offered_start_date} to ${tradeRequest.offered_end_date}) to ${tradeRequest.target_family_group}`;
        }
      } else {
        console.log('Offered reservation not found, may not exist yet');
        executionNotes += `. Note: Offered reservation not found for transfer.`;
      }
    }

    // Update trade request as executed
    await supabaseClient
      .from('trade_requests')
      .update({
        execution_status: 'completed',
        execution_notes: executionNotes,
        executed_at: new Date().toISOString()
      })
      .eq('id', tradeRequestId);

    console.log('Trade executed successfully:', executionNotes);

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Trade executed successfully',
      executionNotes
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: any) {
    console.error("Error in execute-trade function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
