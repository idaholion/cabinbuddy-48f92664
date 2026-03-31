import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ExecuteTradeRequest {
  tradeRequestId: string;
}

/**
 * Determines if a trade is partial (only some days of the reservation)
 * and whether to shrink from the start or end.
 */
function analyzeTradeScope(
  reservation: { start_date: string; end_date: string },
  requestedStart: string,
  requestedEnd: string
): { isPartial: boolean; shrinkFrom: 'start' | 'end' | 'full' } {
  const resStart = reservation.start_date;
  const resEnd = reservation.end_date;

  if (requestedStart <= resStart && requestedEnd >= resEnd) {
    // Full reservation trade
    return { isPartial: false, shrinkFrom: 'full' };
  }

  if (requestedStart <= resStart) {
    // Trading the beginning — shrink from start (move start_date forward)
    return { isPartial: true, shrinkFrom: 'start' };
  }

  if (requestedEnd >= resEnd) {
    // Trading the end — shrink from end (move end_date back)
    return { isPartial: true, shrinkFrom: 'end' };
  }

  // Middle carve — not supported
  throw new Error(
    'Trading days from the middle of a reservation is not supported. ' +
    'Please work with the calendar keeper to handle this manually.'
  );
}

/**
 * Returns the day before a given date string (YYYY-MM-DD).
 */
function dayBefore(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().split('T')[0];
}

/**
 * Returns the day after a given date string (YYYY-MM-DD).
 */
function dayAfter(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().split('T')[0];
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

    // === PRE-CONDITION CHECK: Block if active payment_splits exist ===
    // Check if any payments for this reservation have active splits
    const { data: reservationPayments } = await supabaseClient
      .from('payments')
      .select('id')
      .eq('reservation_id', targetReservation.id)
      .eq('organization_id', tradeRequest.organization_id);

    if (reservationPayments && reservationPayments.length > 0) {
      const paymentIds = reservationPayments.map(p => p.id);
      
      const { data: activeSplits } = await supabaseClient
        .from('payment_splits')
        .select('id, status')
        .in('source_payment_id', paymentIds)
        .neq('status', 'cancelled');

      if (activeSplits && activeSplits.length > 0) {
        console.log('Trade blocked: reservation has active payment splits:', activeSplits.length);
        
        await supabaseClient
          .from('trade_requests')
          .update({
            execution_status: 'failed',
            execution_notes: `Trade blocked: This reservation has ${activeSplits.length} active guest cost split(s). Please resolve or remove the cost splits before trading these dates.`,
            executed_at: new Date().toISOString()
          })
          .eq('id', tradeRequestId);

        throw new Error(
          'This reservation has active guest cost splits. Please resolve or remove the cost splits before trading these dates. Contact the calendar keeper for assistance.'
        );
      }
    }

    // Analyze whether this is a full or partial trade
    let tradeScope: { isPartial: boolean; shrinkFrom: 'start' | 'end' | 'full' };
    try {
      tradeScope = analyzeTradeScope(
        targetReservation,
        tradeRequest.requested_start_date,
        tradeRequest.requested_end_date
      );
    } catch (scopeError: any) {
      await supabaseClient
        .from('trade_requests')
        .update({
          execution_status: 'failed',
          execution_notes: scopeError.message,
          executed_at: new Date().toISOString()
        })
        .eq('id', tradeRequestId);
      throw scopeError;
    }

    console.log('Trade scope:', tradeScope);

    let executionNotes = '';

    if (!tradeScope.isPartial) {
      // === FULL TRADE: Transfer entire reservation (existing behavior) ===
      const { error: transferError } = await supabaseClient
        .from('reservations')
        .update({
          family_group: tradeRequest.requester_family_group,
          host_assignments: [],
          transferred_from: tradeRequest.target_family_group,
          transferred_to: tradeRequest.requester_family_group,
          transfer_type: 'trade',
          updated_at: new Date().toISOString()
        })
        .eq('id', targetReservation.id);

      if (transferError) {
        console.error('Error transferring target reservation:', JSON.stringify(transferError));
        
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

      executionNotes = `Transferred ${tradeRequest.target_family_group}'s entire reservation (${tradeRequest.requested_start_date} to ${tradeRequest.requested_end_date}) to ${tradeRequest.requester_family_group}`;

    } else {
      // === PARTIAL TRADE: Shrink + Create ===
      
      // Step 1: Shrink the original reservation
      let shrinkUpdate: Record<string, any> = { updated_at: new Date().toISOString() };

      if (tradeScope.shrinkFrom === 'start') {
        // Trading the beginning days — move start_date forward to the day after traded period ends
        shrinkUpdate.start_date = dayAfter(tradeRequest.requested_end_date);
        console.log(`Shrinking from start: original ${targetReservation.start_date} → ${shrinkUpdate.start_date}`);
      } else {
        // Trading the ending days — move end_date back to the day before traded period starts
        shrinkUpdate.end_date = dayBefore(tradeRequest.requested_start_date);
        console.log(`Shrinking from end: original ${targetReservation.end_date} → ${shrinkUpdate.end_date}`);
      }

      const { error: shrinkError } = await supabaseClient
        .from('reservations')
        .update(shrinkUpdate)
        .eq('id', targetReservation.id);

      if (shrinkError) {
        console.error('Error shrinking reservation:', shrinkError);
        
        await supabaseClient
          .from('trade_requests')
          .update({
            execution_status: 'failed',
            execution_notes: `Failed to shrink original reservation: ${shrinkError.message}`,
            executed_at: new Date().toISOString()
          })
          .eq('id', tradeRequestId);

        throw new Error('Failed to shrink original reservation');
      }

      // Step 2: Create a new reservation for the traded days, assigned to the requester
      const { error: createError } = await supabaseClient
        .from('reservations')
        .insert({
          organization_id: tradeRequest.organization_id,
          family_group: tradeRequest.requester_family_group,
          start_date: tradeRequest.requested_start_date,
          end_date: tradeRequest.requested_end_date,
          status: 'confirmed',
          host_assignments: [],
          original_reservation_id: targetReservation.id,
          transfer_type: 'partial_trade',
          transferred_from: tradeRequest.target_family_group,
          transferred_to: tradeRequest.requester_family_group,
          property_name: targetReservation.property_name,
          allocated_start_date: tradeRequest.requested_start_date,
          allocated_end_date: tradeRequest.requested_end_date,
        });

      if (createError) {
        console.error('Error creating traded reservation:', createError);

        // Attempt to rollback the shrink
        const rollback: Record<string, any> = { updated_at: new Date().toISOString() };
        if (tradeScope.shrinkFrom === 'start') {
          rollback.start_date = targetReservation.start_date;
        } else {
          rollback.end_date = targetReservation.end_date;
        }
        await supabaseClient
          .from('reservations')
          .update(rollback)
          .eq('id', targetReservation.id);

        await supabaseClient
          .from('trade_requests')
          .update({
            execution_status: 'failed',
            execution_notes: `Failed to create new reservation for traded days: ${createError.message}. Original reservation restored.`,
            executed_at: new Date().toISOString()
          })
          .eq('id', tradeRequestId);

        throw new Error('Failed to create reservation for traded days');
      }

      const shrinkDetail = tradeScope.shrinkFrom === 'start'
        ? `Original reservation shortened to ${shrinkUpdate.start_date} – ${targetReservation.end_date}`
        : `Original reservation shortened to ${targetReservation.start_date} – ${shrinkUpdate.end_date}`;

      executionNotes = `Partial trade: ${tradeRequest.requested_start_date} to ${tradeRequest.requested_end_date} transferred from ${tradeRequest.target_family_group} to ${tradeRequest.requester_family_group}. ${shrinkDetail}`;
    }

    // If this is a trade offer, also handle the offered reservation
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
        // Check for payment splits on offered reservation too
        const { data: offeredPayments } = await supabaseClient
          .from('payments')
          .select('id')
          .eq('reservation_id', offeredReservation.id)
          .eq('organization_id', tradeRequest.organization_id);

        let offeredHasSplits = false;
        if (offeredPayments && offeredPayments.length > 0) {
          const offeredPaymentIds = offeredPayments.map(p => p.id);
          const { data: offeredSplits } = await supabaseClient
            .from('payment_splits')
            .select('id')
            .in('source_payment_id', offeredPaymentIds)
            .neq('status', 'cancelled');
          offeredHasSplits = (offeredSplits && offeredSplits.length > 0);
        }

        if (offeredHasSplits) {
          executionNotes += `. Warning: Could not transfer offered reservation back — it has active cost splits that must be resolved first.`;
        } else {
          // Analyze offered reservation scope
          let offeredScope: { isPartial: boolean; shrinkFrom: 'start' | 'end' | 'full' };
          try {
            offeredScope = analyzeTradeScope(
              offeredReservation,
              tradeRequest.offered_start_date,
              tradeRequest.offered_end_date
            );
          } catch {
            executionNotes += `. Warning: Offered reservation requires middle-carve which is not supported. Calendar keeper should handle manually.`;
            offeredScope = { isPartial: false, shrinkFrom: 'full' }; // won't execute
          }

          if (!offeredScope.isPartial) {
            // Full transfer of offered reservation
            const { error: offerTransferError } = await supabaseClient
              .from('reservations')
              .update({
                family_group: tradeRequest.target_family_group,
                host_assignments: [],
                transferred_from: tradeRequest.requester_family_group,
                transferred_to: tradeRequest.target_family_group,
                transfer_type: 'trade',
                updated_at: new Date().toISOString()
              })
              .eq('id', offeredReservation.id);

            if (offerTransferError) {
              console.error('Error transferring offered reservation:', offerTransferError);
              executionNotes += `. Warning: Failed to transfer offered reservation back to ${tradeRequest.target_family_group}`;
            } else {
              executionNotes += `. Also transferred ${tradeRequest.requester_family_group}'s reservation (${tradeRequest.offered_start_date} to ${tradeRequest.offered_end_date}) to ${tradeRequest.target_family_group}`;
            }
          } else {
            // Partial shrink+create for offered reservation
            let offerShrinkUpdate: Record<string, any> = { updated_at: new Date().toISOString() };

            if (offeredScope.shrinkFrom === 'start') {
              offerShrinkUpdate.start_date = dayAfter(tradeRequest.offered_end_date);
            } else {
              offerShrinkUpdate.end_date = dayBefore(tradeRequest.offered_start_date);
            }

            const { error: offerShrinkError } = await supabaseClient
              .from('reservations')
              .update(offerShrinkUpdate)
              .eq('id', offeredReservation.id);

            if (offerShrinkError) {
              executionNotes += `. Warning: Failed to shrink offered reservation: ${offerShrinkError.message}`;
            } else {
              const { error: offerCreateError } = await supabaseClient
                .from('reservations')
                .insert({
                  organization_id: tradeRequest.organization_id,
                  family_group: tradeRequest.target_family_group,
                  start_date: tradeRequest.offered_start_date,
                  end_date: tradeRequest.offered_end_date,
                  status: 'confirmed',
                  host_assignments: [],
                  original_reservation_id: offeredReservation.id,
                  transfer_type: 'partial_trade',
                  transferred_from: tradeRequest.requester_family_group,
                  transferred_to: tradeRequest.target_family_group,
                  property_name: offeredReservation.property_name,
                  allocated_start_date: tradeRequest.offered_start_date,
                  allocated_end_date: tradeRequest.offered_end_date,
                });

              if (offerCreateError) {
                executionNotes += `. Warning: Shrunk offered reservation but failed to create new record for ${tradeRequest.target_family_group}: ${offerCreateError.message}`;
              } else {
                executionNotes += `. Also partially traded ${tradeRequest.offered_start_date} to ${tradeRequest.offered_end_date} from ${tradeRequest.requester_family_group} to ${tradeRequest.target_family_group}`;
              }
            }
          }
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
