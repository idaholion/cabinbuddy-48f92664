import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';

interface SplitPaymentRequest {
  organizationId: string;
  reservationId?: string | null;
  sourceFamilyGroup: string;
  sourceUserId: string;
  sourceAmount: number;
  sourceDailyOccupancy: Array<{
    date: string;
    guests: number;
    cost: number;
  }>;
  splitUsers: Array<{
    userId: string;
    familyGroup: string;
    displayName: string;
    amount: number;
    dailyOccupancy: Array<{
      date: string;
      guests: number;
      cost: number;
    }>;
  }>;
  description: string;
  dateRange: {
    start: string;
    end: string;
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('❌ [SPLIT-FUNCTION] Missing authorization header');
      throw new Error('Missing authorization header');
    }

    console.log('🔐 [SPLIT-FUNCTION] Auth header present:', authHeader.substring(0, 20) + '...');

    // Extract JWT token from Bearer header
    const token = authHeader.replace('Bearer ', '');

    // Create authenticated client to verify user
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    
    console.log('👤 [SPLIT-FUNCTION] User lookup result:', {
      hasUser: !!user,
      userId: user?.id,
      userEmail: user?.email,
      error: userError?.message
    });
    
    if (userError || !user) {
      console.error('❌ [SPLIT-FUNCTION] User authentication failed:', userError);
      throw new Error('Unauthorized: ' + (userError?.message || 'No user found'));
    }

    // Create service role client for elevated permissions
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const requestData: SplitPaymentRequest = await req.json();
    
    // ============================================
    // VALIDATION: Ensure all data is correct before processing
    // ============================================
    console.log('🔍 [SPLIT-FUNCTION] Validating request data...');
    
    // Validate splitUsers exists and has data
    if (!requestData.splitUsers || !Array.isArray(requestData.splitUsers) || requestData.splitUsers.length === 0) {
      throw new Error('Invalid request: splitUsers array is required and must not be empty');
    }
    
    // Validate each split user has required data
    for (const splitUser of requestData.splitUsers) {
      if (!splitUser.dailyOccupancy || !Array.isArray(splitUser.dailyOccupancy)) {
        throw new Error(`Invalid request: splitUser ${splitUser.displayName} is missing dailyOccupancy array`);
      }
      
      // Calculate expected amount from daily occupancy
      const calculatedAmount = splitUser.dailyOccupancy.reduce((sum, day) => sum + (day.cost || 0), 0);
      
      // Log detailed info for each split user
      console.log(`📊 [SPLIT-FUNCTION] Split user ${splitUser.displayName}:`, {
        familyGroup: splitUser.familyGroup,
        providedAmount: splitUser.amount,
        calculatedAmount,
        daysCount: splitUser.dailyOccupancy.length,
        dailyOccupancy: splitUser.dailyOccupancy.map(d => ({ date: d.date, guests: d.guests, cost: d.cost }))
      });
      
      // CRITICAL VALIDATION: Ensure the amount matches the daily occupancy total
      // Allow small floating point differences
      if (Math.abs(splitUser.amount - calculatedAmount) > 0.01) {
        console.warn(`⚠️ [SPLIT-FUNCTION] Amount mismatch for ${splitUser.displayName}: provided=${splitUser.amount}, calculated=${calculatedAmount}`);
        // Use the calculated amount to ensure consistency
        splitUser.amount = calculatedAmount;
      }
      
      // Validate that daily occupancy has actual guest data
      const totalGuests = splitUser.dailyOccupancy.reduce((sum, day) => sum + (day.guests || 0), 0);
      if (totalGuests === 0) {
        throw new Error(`Invalid request: splitUser ${splitUser.displayName} has no guests in dailyOccupancy`);
      }
    }
    
    // Validate source daily occupancy
    if (!requestData.sourceDailyOccupancy || !Array.isArray(requestData.sourceDailyOccupancy)) {
      throw new Error('Invalid request: sourceDailyOccupancy array is required');
    }
    
    const sourceCalculatedAmount = requestData.sourceDailyOccupancy.reduce((sum, day) => sum + (day.cost || 0), 0);
    console.log('📊 [SPLIT-FUNCTION] Source payment data:', {
      familyGroup: requestData.sourceFamilyGroup,
      providedAmount: requestData.sourceAmount,
      calculatedAmount: sourceCalculatedAmount,
      daysCount: requestData.sourceDailyOccupancy.length,
      dailyOccupancy: requestData.sourceDailyOccupancy.map(d => ({ date: d.date, guests: d.guests, cost: d.cost }))
    });
    
    // CRITICAL VALIDATION: Ensure source amount matches daily occupancy
    if (Math.abs(requestData.sourceAmount - sourceCalculatedAmount) > 0.01) {
      console.warn(`⚠️ [SPLIT-FUNCTION] Source amount mismatch: provided=${requestData.sourceAmount}, calculated=${sourceCalculatedAmount}`);
      // Use calculated amount to ensure consistency
      requestData.sourceAmount = sourceCalculatedAmount;
    }
    
    console.log('🔄 [SPLIT-FUNCTION] Processing split payment request:', {
      user_id: user.id,
      user_email: user.email,
      organization_id: requestData.organizationId,
      reservation_id: requestData.reservationId,
      split_users_count: requestData.splitUsers.length,
      source_amount: requestData.sourceAmount,
      source_daily_occupancy_count: requestData.sourceDailyOccupancy?.length,
      total_split_amount: requestData.splitUsers.reduce((sum, u) => sum + u.amount, 0)
    });

    // Verify user belongs to organization
    const { data: membership, error: membershipError } = await supabaseAdmin
      .from('user_organizations')
      .select('user_id, organization_id, role')
      .eq('user_id', user.id)
      .eq('organization_id', requestData.organizationId)
      .maybeSingle();

    if (membershipError || !membership) {
      console.error('❌ [SPLIT-FUNCTION] User not in organization:', {
        user_id: user.id,
        organization_id: requestData.organizationId,
        error: membershipError
      });
      throw new Error('User does not belong to this organization');
    }

    console.log('✅ [SPLIT-FUNCTION] User verified in organization');

    // Fetch organization's season settings to calculate due date properly
    const { data: orgSettings } = await supabaseAdmin
      .from('reservation_settings')
      .select('season_end_month, season_end_day, season_payment_deadline_offset_days')
      .eq('organization_id', requestData.organizationId)
      .maybeSingle();
    
    // Calculate due date from season end + offset, fallback to Oct 31 if no settings
    const currentYear = new Date().getFullYear();
    const seasonEndMonth = orgSettings?.season_end_month ?? 10; // Default October
    const seasonEndDay = orgSettings?.season_end_day ?? 31;
    const offsetDays = orgSettings?.season_payment_deadline_offset_days ?? 0;
    
    const dueDate = new Date(currentYear, seasonEndMonth - 1, seasonEndDay);
    dueDate.setDate(dueDate.getDate() + offsetDays);
    const dueDateStr = dueDate.toISOString().split('T')[0];

    // ============================================
    // CRITICAL FIX: Check for existing source payment and UPDATE instead of INSERT
    // This prevents creating duplicate payments with zeroed-out data
    // ============================================
    let sourcePayment;
    
    if (requestData.reservationId) {
      console.log('🔍 [SPLIT-FUNCTION] Checking for existing source payment...');
      
      // CRITICAL: Find ALL payments for this reservation, not just one
      const { data: existingPayments, error: existingPaymentError } = await supabaseAdmin
        .from('payments')
        .select('*')
        .eq('reservation_id', requestData.reservationId)
        .eq('family_group', requestData.sourceFamilyGroup)
        .eq('organization_id', requestData.organizationId);
      
      if (existingPaymentError) {
        console.error('❌ [SPLIT-FUNCTION] Error checking for existing payments:', existingPaymentError);
      }
      
      if (existingPayments && existingPayments.length > 0) {
        console.log(`📝 [SPLIT-FUNCTION] Found ${existingPayments.length} existing payment(s) for reservation`);
        
        // PRIORITY: Find the payment with amount_paid > 0 (the one with actual money)
        // Then fall back to one with valid daily_occupancy, then any with amount > 0
        let targetPayment = existingPayments.find(p => (p.amount_paid || 0) > 0);
        
        if (!targetPayment) {
          targetPayment = existingPayments.find(p => {
            const daily = p.daily_occupancy;
            return daily && Array.isArray(daily) && daily.some((d: any) => (d.guests || 0) > 0);
          });
        }
        
        if (!targetPayment) {
          targetPayment = existingPayments.find(p => (p.amount || 0) > 0);
        }
        
        if (!targetPayment) {
          targetPayment = existingPayments[0];
        }
        
        console.log('📝 [SPLIT-FUNCTION] Selected payment to update:', {
          paymentId: targetPayment.id,
          amount_paid: targetPayment.amount_paid,
          oldAmount: targetPayment.amount,
          newAmount: requestData.sourceAmount,
          oldDailyOccupancy: targetPayment.daily_occupancy,
          newDailyOccupancy: requestData.sourceDailyOccupancy
        });
        
        // UPDATE the target payment with the new split amounts, preserving amount_paid
        const { data: updatedPayment, error: updateError } = await supabaseAdmin
          .from('payments')
          .update({
            amount: requestData.sourceAmount,
            daily_occupancy: requestData.sourceDailyOccupancy,
            notes: `Cost split with: ${requestData.splitUsers.map(u => u.displayName).join(', ')}`,
            updated_at: new Date().toISOString(),
            updated_by_user_id: user.id
          })
          .eq('id', targetPayment.id)
          .select()
          .single();
        
        if (updateError) {
          console.error('❌ [SPLIT-FUNCTION] Failed to update existing payment:', updateError);
          throw updateError;
        }
        
        sourcePayment = updatedPayment;
        console.log('✅ [SPLIT-FUNCTION] Source payment UPDATED:', sourcePayment.id, {
          amount: sourcePayment.amount,
          daily_occupancy: sourcePayment.daily_occupancy
        });
        
        // CLEANUP: Delete duplicate payments that don't have amount_paid
        const duplicatesToDelete = existingPayments.filter(p => 
          p.id !== targetPayment.id && (p.amount_paid || 0) === 0
        );
        
        if (duplicatesToDelete.length > 0) {
          console.log(`🧹 [SPLIT-FUNCTION] Cleaning up ${duplicatesToDelete.length} duplicate payment(s)...`);
          
          for (const dup of duplicatesToDelete) {
            const { error: deleteError } = await supabaseAdmin
              .from('payments')
              .delete()
              .eq('id', dup.id);
            
            if (deleteError) {
              console.warn(`⚠️ [SPLIT-FUNCTION] Failed to delete duplicate payment ${dup.id}:`, deleteError);
            } else {
              console.log(`✅ [SPLIT-FUNCTION] Deleted duplicate payment: ${dup.id}`);
            }
          }
        }
      }
    }
    
    // If no existing payment was found/updated, create a new one
    if (!sourcePayment) {
      console.log('📝 [SPLIT-FUNCTION] No existing payment found, creating new source payment...');
      const { data: newSourcePayment, error: sourcePaymentError } = await supabaseAdmin
        .from('payments')
        .insert({
          organization_id: requestData.organizationId,
          reservation_id: requestData.reservationId || null,
          family_group: requestData.sourceFamilyGroup,
          payment_type: 'use_fee',
          amount: requestData.sourceAmount,
          amount_paid: 0,
          status: 'deferred',
          due_date: dueDateStr,
          description: requestData.description,
          notes: `Cost split with: ${requestData.splitUsers.map(u => u.displayName).join(', ')}`,
          daily_occupancy: requestData.sourceDailyOccupancy,
          created_by_user_id: user.id,
        })
        .select()
        .single();

      if (sourcePaymentError) {
        console.error('❌ [SPLIT-FUNCTION] Source payment creation failed:', sourcePaymentError);
        throw sourcePaymentError;
      }
      
      sourcePayment = newSourcePayment;
      console.log('✅ [SPLIT-FUNCTION] New source payment created:', sourcePayment.id);
    }

    // Create payments for each guest user
    const splitResults = [];
    for (const splitUser of requestData.splitUsers) {
      console.log(`📝 [SPLIT-FUNCTION] Creating payment for ${splitUser.displayName}...`);
      
      // CRITICAL: Log exactly what we're about to insert for debugging
      console.log(`📊 [SPLIT-FUNCTION] Split payment data for ${splitUser.displayName}:`, {
        amount: splitUser.amount,
        dailyOccupancyCount: splitUser.dailyOccupancy?.length,
        dailyOccupancy: splitUser.dailyOccupancy,
        familyGroup: splitUser.familyGroup
      });

      // Create guest payment using service role
      const { data: guestPayment, error: guestPaymentError } = await supabaseAdmin
        .from('payments')
        .insert({
          organization_id: requestData.organizationId,
          reservation_id: requestData.reservationId || null,
          family_group: splitUser.familyGroup,
          payment_type: 'use_fee',
          amount: splitUser.amount,
          amount_paid: 0,
          status: 'deferred',
          due_date: dueDateStr,
          description: `Guest cost split - ${requestData.dateRange.start} to ${requestData.dateRange.end}`,
          daily_occupancy: splitUser.dailyOccupancy,
          created_by_user_id: user.id,
          notes: `Split from ${requestData.sourceFamilyGroup}`
        })
        .select()
        .single();

      if (guestPaymentError) {
        console.error(`❌ [SPLIT-FUNCTION] Guest payment creation failed for ${splitUser.displayName}:`, guestPaymentError);
        throw guestPaymentError;
      }

      // CRITICAL: Verify the created payment has correct data
      console.log(`✅ [SPLIT-FUNCTION] Guest payment created for ${splitUser.displayName}:`, {
        paymentId: guestPayment.id,
        amount: guestPayment.amount,
        dailyOccupancy: guestPayment.daily_occupancy
      });
      
      // VALIDATION: Check if the created payment has correct data
      if (guestPayment.amount !== splitUser.amount) {
        console.error(`❌ [SPLIT-FUNCTION] CRITICAL: Created payment amount (${guestPayment.amount}) doesn't match expected (${splitUser.amount})`);
      }

      // Create split tracking record
      console.log(`📝 [SPLIT-FUNCTION] Creating split tracking record for ${splitUser.displayName}...`);
      const { data: splitRecord, error: splitError } = await supabaseAdmin
        .from('payment_splits')
        .insert({
          organization_id: requestData.organizationId,
          source_payment_id: sourcePayment.id,
          split_payment_id: guestPayment.id,
          source_family_group: requestData.sourceFamilyGroup,
          source_user_id: requestData.sourceUserId,
          split_to_family_group: splitUser.familyGroup,
          split_to_user_id: splitUser.userId,
          daily_occupancy_split: splitUser.dailyOccupancy,
          created_by_user_id: user.id,
          notification_status: 'pending'
        })
        .select()
        .single();

      if (splitError) {
        console.error(`❌ [SPLIT-FUNCTION] Split tracking creation failed for ${splitUser.displayName}:`, splitError);
        throw splitError;
      }

      console.log(`✅ [SPLIT-FUNCTION] Split tracking created for ${splitUser.displayName}:`, splitRecord.id);

      // Send notification
      console.log(`📧 [SPLIT-FUNCTION] Sending notification for ${splitUser.displayName}...`);
      try {
        await supabaseAdmin.functions.invoke('send-guest-split-notification', {
          body: {
            splitId: splitRecord.id,
            organizationId: requestData.organizationId
          }
        });
        console.log(`✅ [SPLIT-FUNCTION] Notification sent for ${splitUser.displayName}`);
      } catch (notificationError) {
        console.warn(`⚠️ [SPLIT-FUNCTION] Notification failed for ${splitUser.displayName}:`, notificationError);
        // Don't fail the whole operation if notification fails
      }

      splitResults.push({
        user: splitUser,
        payment: guestPayment,
        split: splitRecord
      });
    }

    console.log('✅ [SPLIT-FUNCTION] All split operations completed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        sourcePayment,
        splits: splitResults,
        wasUpdated: !!requestData.reservationId // Indicate if we updated vs created
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('❌ [SPLIT-FUNCTION] Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
