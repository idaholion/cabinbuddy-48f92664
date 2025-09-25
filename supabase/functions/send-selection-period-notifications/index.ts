import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const handler = async (req: Request): Promise<Response> => {
  console.log('Selection period notifications function invoked');
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get organizations with automated selection reminders enabled
    const { data: organizations, error: orgError } = await supabase
      .from('organizations')
      .select('id, name')
      .eq('automated_selection_reminders_enabled', true);

    if (orgError) {
      console.error('Error fetching organizations:', orgError);
      throw orgError;
    }

    console.log(`Found ${organizations?.length || 0} organizations with selection reminders enabled`);

    if (!organizations || organizations.length === 0) {
      return new Response(JSON.stringify({ 
        message: 'No organizations have automated selection reminders enabled' 
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    let totalNotifications = 0;
    const today = new Date();
    const threeDaysFromNow = new Date(today.getTime() + (3 * 24 * 60 * 60 * 1000));

    // Check for selection periods starting in 3 days or ending today
    for (const org of organizations) {
      console.log(`Checking selection periods for organization: ${org.name}`);
      
      // Check for periods starting in 3 days (start notifications)
      const { data: startingPeriods, error: startError } = await supabase
        .from('reservation_periods')
        .select('*')
        .eq('organization_id', org.id)
        .eq('selection_start_date', threeDaysFromNow.toISOString().split('T')[0]);

      if (startError) {
        console.error('Error fetching starting periods:', startError);
        continue;
      }

      // Check for periods ending today (end notifications)
      const { data: endingPeriods, error: endError } = await supabase
        .from('reservation_periods')
        .select('*')
        .eq('organization_id', org.id)
        .eq('selection_end_date', today.toISOString().split('T')[0]);

      if (endError) {
        console.error('Error fetching ending periods:', endError);
        continue;
      }

      // Send notifications for starting periods
      if (startingPeriods && startingPeriods.length > 0) {
        for (const period of startingPeriods) {
          console.log(`Sending start notification for period: Year ${period.rotation_year}`);
          
          // Get all family groups in this organization
          const { data: familyGroups, error: fgError } = await supabase
            .from('family_groups')
            .select('name, lead_name, lead_email, lead_phone')
            .eq('organization_id', org.id);

          if (fgError) {
            console.error('Error fetching family groups:', fgError);
            continue;
          }

          // Send notifications to each family group
          if (familyGroups) {
            for (const group of familyGroups) {
              if (group.lead_email) {
                try {
                  const { error: notifyError } = await supabase.functions.invoke('send-notification', {
                    body: {
                      type: 'selection_period_start',
                      organization_id: org.id,
                      selection_data: {
                        family_group_name: group.name,
                        guest_email: group.lead_email,
                        guest_name: group.lead_name || group.name,
                        guest_phone: group.lead_phone,
                        selection_year: period.rotation_year.toString(),
                        selection_start_date: period.selection_start_date,
                        selection_end_date: period.selection_end_date,
                        available_periods: 'All available periods'
                      }
                    }
                  });

                  if (notifyError) {
                    console.error('Error sending notification:', notifyError);
                  } else {
                    totalNotifications++;
                    console.log(`Start notification sent to ${group.name} (${group.lead_email})`);
                  }
                } catch (error) {
                  console.error('Error invoking send-notification:', error);
                }
              }
            }
          }
        }
      }

      // Send notifications for ending periods
      if (endingPeriods && endingPeriods.length > 0) {
        for (const period of endingPeriods) {
          console.log(`Sending end notification for period: Year ${period.rotation_year}`);
          
          // Get all family groups in this organization
          const { data: familyGroups, error: fgError } = await supabase
            .from('family_groups')
            .select('name, lead_name, lead_email, lead_phone')
            .eq('organization_id', org.id);

          if (fgError) {
            console.error('Error fetching family groups:', fgError);
            continue;
          }

          // Send notifications to each family group
          if (familyGroups) {
            for (const group of familyGroups) {
              if (group.lead_email) {
                try {
                  const { error: notifyError } = await supabase.functions.invoke('send-notification', {
                    body: {
                      type: 'selection_period_end',
                      organization_id: org.id,
                      selection_data: {
                        family_group_name: group.name,
                        guest_email: group.lead_email,
                        guest_name: group.lead_name || group.name,
                        guest_phone: group.lead_phone,
                        selection_year: period.rotation_year.toString(),
                        selection_start_date: period.selection_start_date,
                        selection_end_date: period.selection_end_date,
                        available_periods: 'Selection period ending'
                      }
                    }
                  });

                  if (notifyError) {
                    console.error('Error sending notification:', notifyError);
                  } else {
                    totalNotifications++;
                    console.log(`End notification sent to ${group.name} (${group.lead_email})`);
                  }
                } catch (error) {
                  console.error('Error invoking send-notification:', error);
                }
              }
            }
          }
        }
      }
    }

    console.log(`Selection period notifications completed. Total sent: ${totalNotifications}`);
    
    return new Response(JSON.stringify({ 
      success: true,
      notifications_sent: totalNotifications,
      organizations_checked: organizations.length
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in send-selection-period-notifications function:', error);
    
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
};

serve(handler);