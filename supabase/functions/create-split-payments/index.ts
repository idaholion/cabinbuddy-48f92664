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
      throw new Error('Missing authorization header');
    }

    // Create authenticated client to verify user
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Create service role client for elevated permissions
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const requestData: SplitPaymentRequest = await req.json();
    console.log('🔄 [SPLIT-FUNCTION] Processing split payment request:', {
      user_id: user.id,
      user_email: user.email,
      organization_id: requestData.organizationId,
      split_users_count: requestData.splitUsers.length
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

    const seasonEnd = new Date(new Date().getFullYear(), 9, 31); // Oct 31

    // Create source payment (Person A - reduced amount)
    console.log('📝 [SPLIT-FUNCTION] Creating source payment...');
    const { data: sourcePayment, error: sourcePaymentError } = await supabaseAdmin
      .from('payments')
      .insert({
        organization_id: requestData.organizationId,
        reservation_id: requestData.reservationId || null,
        family_group: requestData.sourceFamilyGroup,
        payment_type: 'use_fee',
        amount: requestData.sourceAmount,
        amount_paid: 0,
        status: 'deferred',
        due_date: seasonEnd.toISOString().split('T')[0],
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

    console.log('✅ [SPLIT-FUNCTION] Source payment created:', sourcePayment.id);

    // Create payments for each guest user
    const splitResults = [];
    for (const splitUser of requestData.splitUsers) {
      console.log(`📝 [SPLIT-FUNCTION] Creating payment for ${splitUser.displayName}...`);

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
          due_date: seasonEnd.toISOString().split('T')[0],
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

      console.log(`✅ [SPLIT-FUNCTION] Guest payment created for ${splitUser.displayName}:`, guestPayment.id);

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
        splits: splitResults
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
