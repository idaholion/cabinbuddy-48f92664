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
          check_in_date,
          check_out_date,
          family_groups!inner(
            name,
            contact_email,
            contact_name
          )
        `)
        .eq('check_in_date', targetDateString)
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
              reservation: {
                id: reservation.id,
                family_group_name: reservation.family_groups.name,
                check_in_date: reservation.check_in_date,
                check_out_date: reservation.check_out_date,
                guest_email: reservation.family_groups.contact_email,
                guest_name: reservation.family_groups.contact_name,
              },
              days_until: days,
              pre_arrival_checklist: {
                seven_day: [
                  'Review shopping list and coordinate with other families',
                  'Check weather forecast for packing',
                  'Share guest information packet with friends/family joining',
                  'Review cabin rules and policies',
                  'Plan transportation and confirm directions'
                ],
                three_day: [
                  'Final review of shopping list',
                  'Confirm arrival time with calendar keeper if needed',
                  'Pack according to weather forecast',
                  'Double-check emergency contact information',
                  'Review check-in procedures'
                ],
                one_day: [
                  'Final weather check and packing adjustments',
                  'Confirm departure time and route',
                  'Ensure all guests have cabin address and WiFi info',
                  'Last-minute coordination with other families',
                  'Emergency contacts saved in phone'
                ]
              }
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