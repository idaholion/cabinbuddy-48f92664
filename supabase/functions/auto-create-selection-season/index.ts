import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const supabase = createClient(supabaseUrl, supabaseKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const MODE_MARKERS = ['static_weeks_mode', 'manual_mode'];

const toDateString = (date: Date) => {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, '0');
  const d = `${date.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const cleanOrder = (order: unknown): string[] =>
  Array.isArray(order)
    ? (order as string[]).map(String).filter((item) => !MODE_MARKERS.includes(item))
    : [];

const rotateForward = (order: string[], steps: number, firstLastOption: string): string[] => {
  const result = [...order];
  for (let i = 0; i < steps; i++) {
    if (firstLastOption === 'first') {
      const first = result.shift();
      if (first) result.push(first);
    } else {
      const last = result.pop();
      if (last) result.unshift(last);
    }
  }
  return result;
};

const formatDate = (dateStr: string) => {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
};

async function sendAdminHeadsUp(
  org: any,
  targetYear: number,
  turns: { familyGroup: string; startDate: string; endDate: string }[],
) {
  if (!RESEND_API_KEY || !org.admin_email) return;

  const rows = turns
    .map(
      (t, i) =>
        `<tr><td style="padding:6px 12px;">${i + 1}.</td><td style="padding:6px 12px;">${t.familyGroup}</td><td style="padding:6px 12px;">${formatDate(t.startDate)} – ${formatDate(t.endDate)}</td></tr>`,
    )
    .join('');

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; line-height: 1.6;">
      <h2 style="color:#2d5d2d;">${targetYear} Selection Season Created</h2>
      <p>The ${targetYear} selection season for <strong>${org.name}</strong> was created automatically ahead of its start date.</p>
      <p>Selection turns:</p>
      <table style="border-collapse:collapse; font-size:14px;">${rows}</table>
      <p style="margin-top:16px;">If anything looks wrong, open Reservation Setup in CabinBuddy to review it before the first turn begins on ${formatDate(turns[0].startDate)}.</p>
    </div>`;

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'CabinBuddy <notifications@cabinbuddy.org>',
        to: [org.admin_email],
        subject: `${targetYear} selection season created for ${org.name}`,
        html,
      }),
    });
    if (!res.ok) console.error('Heads-up email failed:', await res.text());
  } catch (e) {
    console.error('Heads-up email error:', e);
  }
}

async function processOrganization(org: any) {
  const leadDays = Number(org.selection_season_lead_days ?? 10);

  // Most recent saved season with a real family order is the baseline.
  const { data: seasons } = await supabase
    .from('rotation_orders')
    .select('*')
    .eq('organization_id', org.id)
    .order('rotation_year', { ascending: false });

  const baseline = (seasons || []).find((s) => cleanOrder(s.rotation_order).length > 0);
  if (!baseline) return { organization: org.name, skipped: 'no baseline rotation order' };

  const targetYear = baseline.rotation_year + 1;
  const selectionYear = targetYear - 1;
  const startMonthIndex = Math.max(0, MONTHS.indexOf(baseline.start_month || 'October'));
  const seasonStart = new Date(selectionYear, startMonthIndex, 1);

  const today = new Date();
  const triggerDate = new Date(seasonStart);
  triggerDate.setDate(triggerDate.getDate() - leadDays);

  if (toDateString(today) < toDateString(triggerDate)) {
    return {
      organization: org.name,
      skipped: `not yet — creates on ${toDateString(triggerDate)}`,
      target_year: targetYear,
    };
  }

  // Idempotency: never touch a season that already has dated turns.
  const { data: existingPeriods } = await supabase
    .from('reservation_periods')
    .select('id')
    .eq('organization_id', org.id)
    .eq('rotation_year', targetYear)
    .limit(1);

  if (existingPeriods && existingPeriods.length > 0) {
    return { organization: org.name, skipped: 'season already exists', target_year: targetYear };
  }

  const selectionDays = baseline.selection_days || 14;
  const order = rotateForward(
    cleanOrder(baseline.rotation_order),
    targetYear - baseline.rotation_year,
    baseline.first_last_option || 'first',
  );

  let cursor = new Date(seasonStart);
  const turns = order.map((familyGroup) => {
    const end = new Date(cursor);
    end.setDate(end.getDate() + selectionDays - 1);
    const turn = {
      familyGroup,
      startDate: toDateString(cursor),
      endDate: toDateString(end),
    };
    cursor = new Date(end);
    cursor.setDate(cursor.getDate() + 1);
    return turn;
  });

  const seasonRecord = {
    organization_id: org.id,
    rotation_year: targetYear,
    rotation_order: order,
    start_month: baseline.start_month || 'October',
    selection_days: selectionDays,
    first_last_option: baseline.first_last_option || 'first',
    current_primary_turn_family: order[0],
    max_time_slots: baseline.max_time_slots ?? 2,
    max_nights: baseline.max_nights ?? 7,
    start_day: baseline.start_day || null,
    start_time: baseline.start_time || null,
    enable_secondary_selection: baseline.enable_secondary_selection ?? false,
    secondary_max_periods: baseline.secondary_max_periods ?? 1,
    secondary_selection_days: baseline.secondary_selection_days ?? 7,
  };

  const { data: existingSeason } = await supabase
    .from('rotation_orders')
    .select('id')
    .eq('organization_id', org.id)
    .eq('rotation_year', targetYear)
    .maybeSingle();

  const seasonResult = existingSeason
    ? await supabase.from('rotation_orders').update(seasonRecord).eq('id', existingSeason.id)
    : await supabase.from('rotation_orders').insert(seasonRecord);
  if (seasonResult.error) throw seasonResult.error;

  const { error: periodsError } = await supabase.from('reservation_periods').insert(
    turns.map((turn, index) => ({
      organization_id: org.id,
      rotation_year: targetYear,
      current_family_group: turn.familyGroup,
      current_group_index: index,
      selection_start_date: turn.startDate,
      selection_end_date: turn.endDate,
      reservations_completed: false,
    })),
  );
  if (periodsError) throw periodsError;

  const { data: existingUsage } = await supabase
    .from('time_period_usage')
    .select('family_group')
    .eq('organization_id', org.id)
    .eq('rotation_year', targetYear);

  const tracked = new Set((existingUsage || []).map((u) => u.family_group));
  const newUsage = order
    .filter((group) => !tracked.has(group))
    .map((group) => ({
      organization_id: org.id,
      rotation_year: targetYear,
      family_group: group,
      time_periods_used: 0,
      time_periods_allowed: baseline.max_time_slots ?? 2,
      secondary_periods_used: 0,
      secondary_periods_allowed: baseline.secondary_max_periods ?? 1,
      turn_completed: false,
    }));

  if (newUsage.length > 0) {
    const { error: usageError } = await supabase.from('time_period_usage').insert(newUsage);
    if (usageError) throw usageError;
  }

  await sendAdminHeadsUp(org, targetYear, turns);

  return { organization: org.name, created: true, target_year: targetYear, turns: turns.length };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { data: orgs, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('allocation_model', 'rotating_selection');

    if (error) throw error;

    const results: any[] = [];
    for (const org of orgs || []) {
      if ((org as any).auto_create_selection_season === false) {
        results.push({ organization: org.name, skipped: 'automatic creation turned off' });
        continue;
      }
      try {
        results.push(await processOrganization(org));
      } catch (e) {
        console.error(`Error processing ${org.name}:`, e);
        results.push({ organization: org.name, error: e instanceof Error ? e.message : 'unknown' });
      }
    }

    console.log('auto-create-selection-season results:', JSON.stringify(results));

    return new Response(JSON.stringify({ success: true, results }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('auto-create-selection-season failed:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
