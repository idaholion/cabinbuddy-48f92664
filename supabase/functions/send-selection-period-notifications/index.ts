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
      const { data: potentialStartingPeriods, error: startError } = await supabase
        .from('reservation_periods')
        .select('*')
        .eq('organization_id', org.id);

      if (startError) {
        console.error('Error fetching potential starting periods:', startError);
        continue;
      }

      // Filter based on extensions of previous periods
      const startingPeriods = [];
      if (potentialStartingPeriods) {
        for (const period of potentialStartingPeriods) {
          const scheduledStart = new Date(period.selection_start_date);
          const scheduledStartStr = scheduledStart.toISOString().split('T')[0];
          const threeDaysStr = threeDaysFromNow.toISOString().split('T')[0];
          
          if (scheduledStartStr === threeDaysStr) {
            // Get rotation order to find previous family
            const { data: rotationData } = await supabase
              .from('rotation_orders')
              .select('rotation_order')
              .eq('organization_id', org.id)
              .eq('rotation_year', period.rotation_year)
              .maybeSingle();

            if (rotationData?.rotation_order) {
              const rotationOrder = rotationData.rotation_order;
              const currentIndex = rotationOrder.indexOf(period.current_family_group);
              
              // Handle wrap-around for first family
              const previousIndex = currentIndex > 0 ? currentIndex - 1 : rotationOrder.length - 1;
              const previousFamily = rotationOrder[previousIndex];

              // Check if previous family has an active extension
              const { data: extension } = await supabase
                .from('selection_period_extensions')
                .select('extended_until')
                .eq('organization_id', org.id)
                .eq('rotation_year', period.rotation_year)
                .eq('family_group', previousFamily)
                .maybeSingle();

              // If previous family has extension past this start date, skip
              if (extension?.extended_until) {
                const extendedDate = new Date(extension.extended_until);
                if (extendedDate >= scheduledStart) {
                  console.log(`Skipping start notification - ${previousFamily} extended until ${extension.extended_until}`);
                  continue;
                }
              }
            }

            startingPeriods.push(period);
          }
        }
      }

      // Check for periods ending today (end notifications)
      const { data: potentialEndingPeriods, error: endError } = await supabase
        .from('reservation_periods')
        .select('*')
        .eq('organization_id', org.id);

      if (endError) {
        console.error('Error fetching potential ending periods:', endError);
        continue;
      }

      // Filter based on effective end dates (considering extensions)
      const endingPeriods = [];
      if (potentialEndingPeriods) {
        for (const period of potentialEndingPeriods) {
          // Check for extension
          const { data: extension } = await supabase
            .from('selection_period_extensions')
            .select('extended_until')
            .eq('organization_id', org.id)
            .eq('rotation_year', period.rotation_year)
            .eq('family_group', period.current_family_group)
            .maybeSingle();

          // Determine effective end date
          const effectiveEndDate = extension?.extended_until 
            ? new Date(extension.extended_until) 
            : new Date(period.selection_end_date);

          const effectiveEndDateStr = effectiveEndDate.toISOString().split('T')[0];
          const todayStr = today.toISOString().split('T')[0];
          
          // Only include if effective end date is today
          if (effectiveEndDateStr === todayStr) {
            endingPeriods.push({
              ...period,
              effectiveEndDate: effectiveEndDateStr
            });
            console.log(`Period ending today: ${period.current_family_group} (effective: ${effectiveEndDateStr})`);
          }
        }
      }

      // Send notifications for starting periods
      if (startingPeriods && startingPeriods.length > 0) {
        for (const period of startingPeriods) {
          console.log(`Checking start notification for period: Year ${period.rotation_year}, Current family: ${period.current_family_group || 'none'}`);
          
          // Only send notification if there's a current family group assigned
          if (!period.current_family_group) {
            console.log(`Skipping notification - no current family group set for period ${period.rotation_year}`);
            continue;
          }

          // Get the specific family group whose turn it is
          const { data: familyGroup, error: fgError } = await supabase
            .from('family_groups')
            .select('name, lead_name, lead_email, lead_phone')
            .eq('organization_id', org.id)
            .eq('name', period.current_family_group)
            .single();

          if (fgError) {
            console.error('Error fetching current family group:', fgError);
            continue;
          }

          if (!familyGroup) {
            console.error(`Current family group '${period.current_family_group}' not found`);
            continue;
          }

          // Send notification only to the current family group
          if (familyGroup.lead_email) {
            try {
              const { error: notifyError } = await supabase.functions.invoke('send-notification', {
                body: {
                  type: 'selection_period_start',
                  organization_id: org.id,
                  selection_data: {
                    family_group_name: familyGroup.name,
                    guest_email: familyGroup.lead_email,
                    guest_name: familyGroup.lead_name || familyGroup.name,
                    guest_phone: familyGroup.lead_phone,
                    selection_year: period.rotation_year.toString(),
                    selection_start_date: period.selection_start_date,
                    selection_end_date: period.selection_end_date,
                    available_periods: 'Your selection period is starting'
                  }
                }
              });

              if (notifyError) {
                console.error('Error sending notification:', notifyError);
              } else {
                totalNotifications++;
                console.log(`Start notification sent to ${familyGroup.name} (${familyGroup.lead_email}) - it's their turn`);
              }
            } catch (error) {
              console.error('Error invoking send-notification:', error);
            }
          } else {
            console.log(`No email address for family group ${familyGroup.name}, skipping notification`);
          }
        }
      }

      // Send notifications for ending periods
      if (endingPeriods && endingPeriods.length > 0) {
        for (const period of endingPeriods) {
          console.log(`Checking end notification for period: Year ${period.rotation_year}, Current family: ${period.current_family_group || 'none'}`);
          
          // Only send notification if there's a current family group assigned
          if (!period.current_family_group) {
            console.log(`Skipping notification - no current family group set for period ${period.rotation_year}`);
            continue;
          }

          // Get the specific family group whose turn it is
          const { data: familyGroup, error: fgError } = await supabase
            .from('family_groups')
            .select('name, lead_name, lead_email, lead_phone')
            .eq('organization_id', org.id)
            .eq('name', period.current_family_group)
            .single();

          if (fgError) {
            console.error('Error fetching current family group:', fgError);
            continue;
          }

          if (!familyGroup) {
            console.error(`Current family group '${period.current_family_group}' not found`);
            continue;
          }

          // Send notification only to the current family group
          if (familyGroup.lead_email) {
            try {
              const { error: notifyError } = await supabase.functions.invoke('send-notification', {
                body: {
                  type: 'selection_period_end',
                  organization_id: org.id,
                  selection_data: {
                    family_group_name: familyGroup.name,
                    guest_email: familyGroup.lead_email,
                    guest_name: familyGroup.lead_name || familyGroup.name,
                    guest_phone: familyGroup.lead_phone,
                    selection_year: period.rotation_year.toString(),
                    selection_start_date: period.selection_start_date,
                    selection_end_date: period.selection_end_date,
                    available_periods: 'Your selection period is ending'
                  }
                }
              });

              if (notifyError) {
                console.error('Error sending notification:', notifyError);
              } else {
                totalNotifications++;
                console.log(`End notification sent to ${familyGroup.name} (${familyGroup.lead_email}) - their selection period is ending`);
              }
            } catch (error) {
              console.error('Error invoking send-notification:', error);
            }
          } else {
            console.log(`No email address for family group ${familyGroup.name}, skipping notification`);
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