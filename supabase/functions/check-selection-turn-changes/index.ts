import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Checking for selection turn changes...');

    // Get organizations with automated selection turn notifications enabled
    const { data: turnOrgs, error: turnOrgError } = await supabase
      .from('organizations')
      .select('id, name')
      .eq('automated_selection_turn_notifications_enabled', true);

    if (turnOrgError) throw turnOrgError;

    // Get organizations with ending tomorrow reminders enabled
    const { data: endingOrgs, error: endingOrgError } = await supabase
      .from('organizations')
      .select('id, name')
      .eq('automated_selection_ending_tomorrow_enabled', true);

    if (endingOrgError) throw endingOrgError;

    const allOrganizations = [...(turnOrgs || []), ...(endingOrgs || [])];
    const uniqueOrgs = Array.from(new Map(allOrganizations.map(org => [org.id, org])).values());

    if (uniqueOrgs.length === 0) {
      console.log('No organizations have automated selection notifications enabled');
      return new Response(JSON.stringify({ 
        success: true,
        notifications_sent: 0,
        message: 'No organizations enabled'
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const turnOrgIds = new Set(turnOrgs?.map(o => o.id) || []);
    const endingOrgIds = new Set(endingOrgs?.map(o => o.id) || []);

    let totalNotifications = 0;
    const currentYear = new Date().getFullYear();
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    for (const org of uniqueOrgs) {
      console.log(`Checking organization: ${org.name}`);
      const checkTurnNotifications = turnOrgIds.has(org.id);
      const checkEndingTomorrow = endingOrgIds.has(org.id);

      // Check current year and next year
      for (const year of [currentYear, currentYear + 1]) {
        // Get rotation order for this year
        const { data: rotationData } = await supabase
          .from('rotation_orders')
          .select('rotation_order, first_last_option, rotation_start_month')
          .eq('organization_id', org.id)
          .eq('rotation_year', year)
          .maybeSingle();

        if (!rotationData?.rotation_order) continue;

        const rotationOrder = rotationData.rotation_order;

        // Get time period usage
        const { data: usageData } = await supabase
          .from('time_period_usage')
          .select('*')
          .eq('organization_id', org.id)
          .eq('rotation_year', year);

        if (!usageData) continue;

        // Get extensions
        const { data: extensionsData } = await supabase
          .from('selection_period_extensions')
          .select('*')
          .eq('organization_id', org.id)
          .eq('rotation_year', year);

        // Get current family from rotation_orders table (explicit tracking)
        const { data: currentTurnData } = await supabase
          .from('rotation_orders')
          .select('current_primary_turn_family')
          .eq('organization_id', org.id)
          .eq('rotation_year', year)
          .maybeSingle();

        let currentFamily = currentTurnData?.current_primary_turn_family || null;

        if (!currentFamily) {
          console.log(`No current family for ${org.name} year ${year}`);
          continue;
        }

        // Check for active extension for the current family
        const currentExtension = extensionsData?.find(e => 
          e.family_group === currentFamily && new Date(e.extended_until) >= now
        );

        // Check if current family's extension has expired
        const expiredExtension = extensionsData?.find(e => 
          e.family_group === currentFamily && new Date(e.extended_until) < now
        );

        // If extension expired and they haven't completed, auto-advance
        if (expiredExtension && checkTurnNotifications) {
          const usage = usageData.find(u => u.family_group === currentFamily);
          const turnCompleted = usage?.turn_completed || false;
          const usedPrimary = usage?.time_periods_used || 0;
          const allowedPrimary = usage?.time_periods_allowed || 0;

          // Only auto-advance if they haven't explicitly completed and haven't used all periods
          if (!turnCompleted && usedPrimary < allowedPrimary) {
            console.log(`Auto-advancing from ${currentFamily} due to expired extension`);
            
            // Mark turn as completed
            await supabase
              .from('time_period_usage')
              .update({ turn_completed: true })
              .eq('organization_id', org.id)
              .eq('rotation_year', year)
              .eq('family_group', currentFamily);

            // Find next family
            const currentIndex = rotationOrder.indexOf(currentFamily);
            let nextFamily: string | null = null;

            for (let i = 1; i <= rotationOrder.length; i++) {
              const nextIndex = (currentIndex + i) % rotationOrder.length;
              const candidateFamily = rotationOrder[nextIndex];
              
              const nextUsage = usageData.find(u => u.family_group === candidateFamily);
              const nextTurnCompleted = nextUsage?.turn_completed || false;
              
              if (!nextTurnCompleted) {
                nextFamily = candidateFamily;
                break;
              }
            }

            // Update current_primary_turn_family
            await supabase
              .from('rotation_orders')
              .update({ current_primary_turn_family: nextFamily })
              .eq('organization_id', org.id)
              .eq('rotation_year', year);

            currentFamily = nextFamily;

            if (currentFamily) {
              // Send notification to new family
              console.log(`Sending turn notification to ${currentFamily} after auto-advance`);
              await supabase.functions.invoke('send-selection-turn-notification', {
                body: {
                  organization_id: org.id,
                  family_group: currentFamily,
                  rotation_year: year
                }
              });

              await supabase
                .from('selection_turn_notifications_sent')
                .insert({
                  organization_id: org.id,
                  rotation_year: year,
                  family_group: currentFamily,
                  phase: 'primary'
                });
              totalNotifications++;
            }
            
            continue; // Skip to next iteration since we already handled this
          }
        }

        if (!currentFamily) {
          console.log(`No current family for ${org.name} year ${year} after auto-advance check`);
          continue;
        }

        // Check turn notifications
        if (checkTurnNotifications) {
          const { data: alreadySent } = await supabase
            .from('selection_turn_notifications_sent')
            .select('id')
            .eq('organization_id', org.id)
            .eq('rotation_year', year)
            .eq('family_group', currentFamily)
            .eq('phase', 'primary')
            .maybeSingle();

          if (!alreadySent) {
            console.log(`Sending turn notification to ${currentFamily} for ${year}`);
            const { error: sendError } = await supabase.functions.invoke('send-selection-turn-notification', {
              body: {
                organization_id: org.id,
                family_group: currentFamily,
                rotation_year: year
              }
            });

            if (!sendError) {
              await supabase
                .from('selection_turn_notifications_sent')
                .insert({
                  organization_id: org.id,
                  rotation_year: year,
                  family_group: currentFamily,
                  phase: 'primary'
                });
              totalNotifications++;
            } else {
              console.error(`Error sending turn notification: ${sendError.message}`);
            }
          }
        }

        // Check ending tomorrow notifications
        if (checkEndingTomorrow) {
          // Re-fetch current extension for ending tomorrow check
          const extension = extensionsData?.find(e => 
            e.family_group === currentFamily && new Date(e.extended_until) >= now
          );

          if (extension) {
            const extendedUntil = new Date(extension.extended_until);
            const isTomorrow = 
              extendedUntil.getFullYear() === tomorrow.getFullYear() &&
              extendedUntil.getMonth() === tomorrow.getMonth() &&
              extendedUntil.getDate() === tomorrow.getDate();

            if (isTomorrow) {
              const { data: endingAlreadySent } = await supabase
                .from('selection_turn_notifications_sent')
                .select('id')
                .eq('organization_id', org.id)
                .eq('rotation_year', year)
                .eq('family_group', currentFamily)
                .eq('phase', 'ending_tomorrow')
                .maybeSingle();

              if (!endingAlreadySent) {
                console.log(`Sending ending tomorrow notification to ${currentFamily} for ${year}`);
                const { error: sendError } = await supabase.functions.invoke('send-selection-turn-notification', {
                  body: {
                    organization_id: org.id,
                    family_group: currentFamily,
                    rotation_year: year,
                    notification_type: 'ending_tomorrow'
                  }
                });

                if (!sendError) {
                  await supabase
                    .from('selection_turn_notifications_sent')
                    .insert({
                      organization_id: org.id,
                      rotation_year: year,
                      family_group: currentFamily,
                      phase: 'ending_tomorrow'
                    });
                  totalNotifications++;
                } else {
                  console.error(`Error sending ending tomorrow notification: ${sendError.message}`);
                }
              }
            }
          }
        }
      }
    }

    console.log(`Selection turn check completed. Sent ${totalNotifications} notifications`);

    return new Response(JSON.stringify({ 
      success: true,
      notifications_sent: totalNotifications,
      organizations_checked: uniqueOrgs.length
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in check-selection-turn-changes:', error);
    
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
