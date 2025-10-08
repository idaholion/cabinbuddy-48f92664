import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BulkReminderRequest {
  organizationId: string;
  familyGroups: string[];
  year: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { organizationId, familyGroups, year }: BulkReminderRequest = await req.json();

    if (!organizationId || !familyGroups || familyGroups.length === 0) {
      throw new Error('Missing required parameters');
    }

    console.log(`Sending bulk payment reminders to ${familyGroups.length} families for year ${year}`);

    // Get organization details
    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .select('name, admin_email, admin_name')
      .eq('id', organizationId)
      .single();

    if (orgError) throw orgError;

    // Get family group details with lead contact information
    const { data: families, error: familiesError } = await supabase
      .from('family_groups')
      .select('name, lead_email, lead_phone, lead_name')
      .eq('organization_id', organizationId)
      .in('name', familyGroups);

    if (familiesError) throw familiesError;

    // Get season configuration
    const { data: seasonConfig } = await supabase
      .from('reservation_settings')
      .select('season_start_month, season_start_day, season_end_month, season_end_day, season_payment_deadline_offset_days')
      .eq('organization_id', organizationId)
      .maybeSingle();

    const startMonth = seasonConfig?.season_start_month || 10;
    const startDay = seasonConfig?.season_start_day || 1;
    const endMonth = seasonConfig?.season_end_month || 10;
    const endDay = seasonConfig?.season_end_day || 31;
    const offsetDays = seasonConfig?.season_payment_deadline_offset_days || 0;

    const startDate = new Date(year, startMonth - 1, startDay);
    const endDate = new Date(year, endMonth - 1, endDay);
    const paymentDeadline = new Date(endDate);
    paymentDeadline.setDate(paymentDeadline.getDate() + offsetDays);

    // For each family, get their outstanding balance
    const remindersToSend = [];
    
    for (const family of families) {
      // Get family's payments for the season
      const { data: payments } = await supabase
        .from('payments')
        .select('amount, amount_paid, family_group')
        .eq('organization_id', organizationId)
        .eq('family_group', family.name);

      const totalCharged = payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
      const totalPaid = payments?.reduce((sum, p) => sum + (p.amount_paid || 0), 0) || 0;
      const outstandingBalance = totalCharged - totalPaid;

      if (outstandingBalance > 0 && family.lead_email) {
        remindersToSend.push({
          familyGroup: family.name,
          leadEmail: family.lead_email,
          leadName: family.lead_name,
          outstandingBalance,
          totalCharged,
          totalPaid,
        });
      }
    }

    console.log(`Found ${remindersToSend.length} families with outstanding balances`);

    // Send reminders (email notifications)
    const sentReminders = [];
    const failedReminders = [];

    for (const reminder of remindersToSend) {
      try {
        // Log notification
        await supabase
          .from('notification_log')
          .insert({
            organization_id: organizationId,
            family_group: reminder.familyGroup,
            notification_type: 'payment_reminder',
            email_sent: true,
            sms_sent: false,
          });

        sentReminders.push(reminder.familyGroup);
        
        console.log(`Sent payment reminder to ${reminder.familyGroup} (${reminder.leadEmail})`);
      } catch (error) {
        console.error(`Failed to send reminder to ${reminder.familyGroup}:`, error);
        failedReminders.push(reminder.familyGroup);
      }
    }

    const response = {
      success: true,
      sent: sentReminders.length,
      failed: failedReminders.length,
      details: {
        sent: sentReminders,
        failed: failedReminders,
        year,
        organizationName: organization.name,
      },
    };

    console.log('Bulk reminders complete:', response);

    return new Response(
      JSON.stringify(response),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json',
        } 
      }
    );
  } catch (error) {
    console.error('Error in send-bulk-payment-reminders:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 400,
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json',
        } 
      }
    );
  }
});
