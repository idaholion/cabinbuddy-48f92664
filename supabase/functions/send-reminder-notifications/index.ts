import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Running reminder notification check...');
    
    // Check if any organizations have automated reminders enabled
    const { data: enabledOrgs, error: orgError } = await supabase
      .from('organizations')
      .select('id, name')
      .eq('automated_reminders_enabled', true);
    
    if (orgError) {
      console.error('Error fetching enabled organizations:', orgError);
      throw orgError;
    }
    
    if (!enabledOrgs || enabledOrgs.length === 0) {
      console.log('No organizations have automated reminders enabled');
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No organizations with automated reminders enabled' 
      }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      });
    }
    
    console.log(`Found ${enabledOrgs.length} organizations with automated reminders enabled`);
    
    // Get upcoming reservations based on enabled reminder days
    const reminderDays = [];
    
    // Check which specific reminder days are enabled for each organization
    for (const org of enabledOrgs) {
      console.log(`Checking reminder day settings for ${org.name}`);
      
      // Get detailed organization settings
      const { data: orgDetails, error: orgDetailError } = await supabase
        .from('organizations')
        .select('id, name, automated_reminders_7_day_enabled, automated_reminders_3_day_enabled, automated_reminders_1_day_enabled')
        .eq('id', org.id)
        .single();
        
      if (orgDetailError || !orgDetails) {
        console.error(`Error fetching org details for ${org.id}:`, orgDetailError);
        continue;
      }
      
      // Build reminder days array based on enabled settings
      const orgReminderDays = [];
      if (orgDetails.automated_reminders_7_day_enabled) orgReminderDays.push(7);
      if (orgDetails.automated_reminders_3_day_enabled) orgReminderDays.push(3);
      if (orgDetails.automated_reminders_1_day_enabled) orgReminderDays.push(1);
      
      console.log(`${org.name} has these reminder days enabled:`, orgReminderDays);
      
      // Process each enabled reminder day for this organization
      for (const days of orgReminderDays) {
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + days);
        const targetDateString = targetDate.toISOString().split('T')[0];
        
        console.log(`Checking for reservations ${days} days away (${targetDateString}) for ${org.name}`);
        
        // Query reservations for the target date from this specific organization
        const { data: reservations, error } = await supabase
          .from('reservations')
          .select(`
            id,
            start_date,
            end_date,
            family_group,
            organization_id,
            organizations!inner(
              id,
              name
            ),
            family_groups!inner(
              lead_email,
              lead_name,
              lead_phone
            )
          `)
          .eq('start_date', targetDateString)
          .eq('status', 'confirmed')
          .eq('organization_id', org.id);
        
        if (error) {
          console.error(`Error fetching reservations for ${days} days:`, error);
          continue;
        }
        
        console.log(`Found ${reservations?.length || 0} reservations for ${days} days reminder for ${org.name}`);
        
        // Send reminder notifications
        for (const reservation of reservations || []) {
          try {
            const notificationResponse = await supabase.functions.invoke('send-notification', {
              body: {
                type: 'reminder',
                organization_id: reservation.organization_id,
                reservation: {
                  id: reservation.id,
                  family_group_name: reservation.family_group,
                  check_in_date: reservation.start_date,
                  check_out_date: reservation.end_date,
                  guest_email: reservation.family_groups?.[0]?.lead_email || '',
                  guest_name: reservation.family_groups?.[0]?.lead_name || '',
                  guest_phone: reservation.family_groups?.[0]?.lead_phone || '',
                },
                days_until: days,
              }
            });
            
            if (notificationResponse.error) {
              console.error(`Error sending reminder for reservation ${reservation.id}:`, notificationResponse.error);
            } else {
              console.log(`Reminder sent successfully for reservation ${reservation.id} (${days} days)`);
            }
          } catch (error) {
            console.error(`Failed to send reminder for reservation ${reservation.id}:`, error);
          }
        }
      }
    }
    
    return new Response(JSON.stringify({ success: true, message: 'Reminder notifications processed' }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-reminder-notifications function:", error);
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