import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  organization_id: string;
  family_group: string;
  rotation_year: number;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { organization_id, family_group, rotation_year }: RequestBody = await req.json();

    console.log(`Sending selection turn notification for ${family_group} in year ${rotation_year}`);

    // Get family group details
    const { data: familyData, error: familyError } = await supabase
      .from('family_groups')
      .select('name, lead_name, lead_email, lead_phone')
      .eq('organization_id', organization_id)
      .eq('name', family_group)
      .single();

    if (familyError || !familyData) {
      throw new Error(`Family group not found: ${family_group}`);
    }

    // Get reservation period details
    const { data: periodData } = await supabase
      .from('reservation_periods')
      .select('selection_start_date, selection_end_date')
      .eq('organization_id', organization_id)
      .eq('rotation_year', rotation_year)
      .eq('current_family_group', family_group)
      .maybeSingle();

    // Get time period usage to calculate available periods
    const { data: usageData } = await supabase
      .from('time_period_usage')
      .select('time_periods_used, time_periods_allowed')
      .eq('organization_id', organization_id)
      .eq('rotation_year', rotation_year)
      .eq('family_group', family_group)
      .maybeSingle();

    const periodsUsed = usageData?.time_periods_used || 0;
    const periodsAllowed = usageData?.time_periods_allowed || 0;
    const periodsRemaining = Math.max(0, periodsAllowed - periodsUsed);

    // Send notification
    const { error: notifyError } = await supabase.functions.invoke('send-notification', {
      body: {
        type: 'selection_turn_ready',
        organization_id: organization_id,
        selection_data: {
          family_group_name: familyData.name,
          guest_email: familyData.lead_email,
          guest_name: familyData.lead_name || familyData.name,
          guest_phone: familyData.lead_phone,
          selection_year: rotation_year.toString(),
          selection_start_date: periodData?.selection_start_date || '',
          selection_end_date: periodData?.selection_end_date || '',
          available_periods: `${periodsRemaining} of ${periodsAllowed} periods remaining`
        }
      }
    });

    if (notifyError) {
      throw notifyError;
    }

    console.log(`Notification sent successfully to ${familyData.name}`);

    return new Response(JSON.stringify({ 
      success: true,
      message: `Notification sent to ${familyData.name}`
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error sending selection turn notification:', error);
    
    return new Response(JSON.stringify({ 
      error: 'Failed to send notification',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
};

serve(handler);
