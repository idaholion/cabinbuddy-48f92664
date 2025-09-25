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
  console.log('Work weekend notifications function invoked');
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get organizations with automated work weekend reminders enabled
    const { data: organizations, error: orgError } = await supabase
      .from('organizations')
      .select('id, name')
      .eq('automated_work_weekend_reminders_enabled', true);

    if (orgError) {
      console.error('Error fetching organizations:', orgError);
      throw orgError;
    }

    console.log(`Found ${organizations?.length || 0} organizations with work weekend reminders enabled`);

    if (!organizations || organizations.length === 0) {
      return new Response(JSON.stringify({ 
        message: 'No organizations have automated work weekend reminders enabled' 
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    let totalNotifications = 0;
    const today = new Date();
    const reminderDays = [7, 3, 1]; // Send reminders 7, 3, and 1 day before

    // Check for work weekends in the next 7 days
    for (const org of organizations) {
      console.log(`Checking work weekends for organization: ${org.name}`);
      
      for (const days of reminderDays) {
        const targetDate = new Date(today.getTime() + (days * 24 * 60 * 60 * 1000));
        const targetDateStr = targetDate.toISOString().split('T')[0];
        
        console.log(`Checking for work weekends on ${targetDateStr} (${days} days away)`);

        // Find work weekends starting on the target date
        const { data: workWeekends, error: wwError } = await supabase
          .from('work_weekends')
          .select(`
            id,
            title,
            start_date,
            end_date,
            proposer_family_group,
            status
          `)
          .eq('organization_id', org.id)
          .eq('start_date', targetDateStr)
          .in('status', ['fully_approved', 'approved']);

        if (wwError) {
          console.error('Error fetching work weekends:', wwError);
          continue;
        }

        if (workWeekends && workWeekends.length > 0) {
          console.log(`Found ${workWeekends.length} work weekends starting on ${targetDateStr}`);
          
          for (const workWeekend of workWeekends) {
            // Get all family groups for notifications
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
                        type: 'work_weekend_reminder',
                        organization_id: org.id,
                        family_group: group.name,
                        guest_name: group.lead_name,
                        guest_email: group.lead_email,
                        guest_phone: group.lead_phone,
                        days_until: days,
                        work_weekend: {
                          title: workWeekend.title,
                          start_date: workWeekend.start_date,
                          end_date: workWeekend.end_date,
                          proposer_family_group: workWeekend.proposer_family_group,
                          status: workWeekend.status
                        }
                      }
                    });

                    if (notifyError) {
                      console.error('Error sending work weekend notification:', notifyError);
                    } else {
                      totalNotifications++;
                      console.log(`Work weekend reminder sent to ${group.name} (${group.lead_email}) - ${days} days ahead`);
                    }
                  } catch (error) {
                    console.error('Error invoking send-notification for work weekend:', error);
                  }
                }
              }
            }
          }
        }
      }
    }

    console.log(`Work weekend notifications completed. Total sent: ${totalNotifications}`);
    
    return new Response(JSON.stringify({ 
      success: true,
      notifications_sent: totalNotifications,
      organizations_checked: organizations.length
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in send-work-weekend-notifications function:', error);
    
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