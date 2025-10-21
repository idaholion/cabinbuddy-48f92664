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
    const { data: organizations, error: orgError } = await supabase
      .from('organizations')
      .select('id, name')
      .eq('automated_selection_turn_notifications_enabled', true);

    if (orgError) throw orgError;

    if (!organizations || organizations.length === 0) {
      console.log('No organizations have automated selection turn notifications enabled');
      return new Response(JSON.stringify({ 
        success: true,
        notifications_sent: 0,
        message: 'No organizations enabled'
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    let totalNotifications = 0;
    const currentYear = new Date().getFullYear();

    for (const org of organizations) {
      console.log(`Checking organization: ${org.name}`);

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

        // Determine current family using same logic as useSequentialSelection
        let currentFamily: string | null = null;
        const now = new Date();

        for (const familyGroup of rotationOrder) {
          const usage = usageData.find(u => u.family_group === familyGroup);
          const usedPrimary = usage?.time_periods_used || 0;
          const allowedPrimary = usage?.time_periods_allowed || 0;

          // Check for active extension
          const extension = extensionsData?.find(e => e.family_group === familyGroup);
          const hasActiveExtension = extension && new Date(extension.extended_until) >= now;

          // If family hasn't used all their periods or has active extension, they're current
          if (usedPrimary < allowedPrimary || hasActiveExtension) {
            currentFamily = familyGroup;
            break;
          }
        }

        if (!currentFamily) {
          console.log(`No current family for ${org.name} year ${year}`);
          continue;
        }

        // Check if notification already sent
        const { data: alreadySent } = await supabase
          .from('selection_turn_notifications_sent')
          .select('id')
          .eq('organization_id', org.id)
          .eq('rotation_year', year)
          .eq('family_group', currentFamily)
          .eq('phase', 'primary')
          .maybeSingle();

        if (alreadySent) {
          console.log(`Notification already sent to ${currentFamily} for ${year}`);
          continue;
        }

        // Send notification
        console.log(`Sending notification to ${currentFamily} for ${year}`);
        const { error: sendError } = await supabase.functions.invoke('send-selection-turn-notification', {
          body: {
            organization_id: org.id,
            family_group: currentFamily,
            rotation_year: year
          }
        });

        if (sendError) {
          console.error(`Error sending notification: ${sendError.message}`);
          continue;
        }

        // Record notification sent
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
    }

    console.log(`Selection turn check completed. Sent ${totalNotifications} notifications`);

    return new Response(JSON.stringify({ 
      success: true,
      notifications_sent: totalNotifications,
      organizations_checked: organizations.length
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
