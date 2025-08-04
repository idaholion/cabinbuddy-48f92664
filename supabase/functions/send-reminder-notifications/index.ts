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
    
    // Get upcoming reservations (within 7, 3, and 1 days)
    const reminderDays = [7, 3, 1];
    
    for (const days of reminderDays) {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + days);
      const targetDateString = targetDate.toISOString().split('T')[0];
      
      console.log(`Checking for reservations ${days} days away (${targetDateString})`);
      
      // Query reservations for the target date
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
        .eq('status', 'confirmed');
      
      if (error) {
        console.error(`Error fetching reservations for ${days} days:`, error);
        continue;
      }
      
      console.log(`Found ${reservations?.length || 0} reservations for ${days} days reminder`);
      
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
                guest_email: reservation.family_groups.lead_email,
                guest_name: reservation.family_groups.lead_name,
                guest_phone: reservation.family_groups.lead_phone,
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