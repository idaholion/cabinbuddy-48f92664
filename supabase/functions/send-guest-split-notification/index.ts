import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SplitNotificationData {
  splitId: string;
  organizationId: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting guest split notification process');
    
    const { splitId, organizationId }: SplitNotificationData = await req.json();
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch split details with payment and user information
    const { data: split, error: splitError } = await supabase
      .from('payment_splits')
      .select(`
        *,
        source_payment:payments!payment_splits_source_payment_id_fkey(
          reservation_id,
          amount,
          daily_occupancy
        ),
        split_payment:payments!payment_splits_split_payment_id_fkey(
          id,
          amount,
          daily_occupancy
        )
      `)
      .eq('id', splitId)
      .single();

    if (splitError) {
      console.error('Error fetching split:', splitError);
      throw splitError;
    }

    console.log('Split fetched successfully:', split.id);

    // Get organization details
    const { data: org } = await supabase
      .from('organizations')
      .select('name')
      .eq('id', organizationId)
      .single();

    // Get user emails using the database function
    const { data: users } = await supabase
      .rpc('get_organization_user_emails', { org_id: organizationId });

    const sourceUser = users?.find((u: any) => u.user_id === split.source_user_id);
    const splitToUser = users?.find((u: any) => u.user_id === split.split_to_user_id);

    if (!splitToUser?.email) {
      throw new Error('Recipient email not found');
    }

    console.log('Sending notification to:', splitToUser.email);

    // Build daily breakdown for notification
    const dailyBreakdown = split.daily_occupancy_split.map((day: any) => 
      `${day.date}: ${day.guests} guests - $${day.cost.toFixed(2)}`
    ).join('\n');

    const totalAmount = split.split_payment.amount;
    const currentYear = new Date().getFullYear();

    // For now, log the email content (will be replaced with actual email sending when RESEND_API_KEY is configured)
    const emailContent = {
      to: splitToUser.email,
      from: `${org?.name || 'Cabin Buddy'} <noreply@cabinbuddy.org>`,
      subject: `Guest Cost Split - ${org?.name || 'Cabin'}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Guest Cost Split Notification</h2>
          
          <p>Hi ${splitToUser.display_name || splitToUser.first_name},</p>
          
          <p><strong>${sourceUser?.display_name || sourceUser?.first_name}</strong> from <strong>${split.source_family_group}</strong> has split cabin costs with you for their recent stay.</p>
          
          <h3 style="color: #374151;">Your Portion of the Stay:</h3>
          <pre style="background: #f5f5f5; padding: 12px; border-radius: 4px; border: 1px solid #e5e7eb;">
${dailyBreakdown}
          </pre>
          
          <p style="font-size: 18px; font-weight: bold; color: #2563eb;">Total Amount: $${totalAmount.toFixed(2)}</p>
          
          <p>This charge has been added to your Season Summary. You can view details and make payment by visiting your Season Summary page.</p>
          
          <div style="margin: 20px 0;">
            <a href="${supabaseUrl.replace('.supabase.co', '.lovable.app')}/season-summary?year=${currentYear}" 
               style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
              View Season Summary
            </a>
          </div>
          
          <p style="color: #666; font-size: 14px;">If you have questions about this charge, please contact ${sourceUser?.display_name || sourceUser?.first_name} at ${sourceUser?.email}.</p>
          
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;" />
          
          <p style="color: #999; font-size: 12px;">This is an automated message from ${org?.name || 'Cabin Buddy'}.</p>
        </div>
      `
    };

    console.log('Email content prepared:', emailContent.subject);

    // Update notification status
    const { error: updateError } = await supabase
      .from('payment_splits')
      .update({
        notification_sent_at: new Date().toISOString(),
        notification_status: 'sent',
        updated_at: new Date().toISOString()
      })
      .eq('id', splitId);

    if (updateError) {
      console.error('Error updating notification status:', updateError);
      throw updateError;
    }

    console.log('Notification status updated successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Notification logged successfully',
        emailPreview: emailContent 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in guest split notification:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
