import { createClient } from "npm:@supabase/supabase-js@2.39.3";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface FeedbackNotificationRequest {
  feedback_id: string;
  type: string;
  title: string;
  description: string;
  email?: string;
  page?: string;
  organization_id?: string;
}

const typeLabels: Record<string, string> = {
  bug: '🐛 Bug Report',
  feature: '💡 Feature Request',
  improvement: '🔧 Improvement Suggestion',
  general: '💬 General Feedback',
  supervisor_request: '📋 Supervisor Request',
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { feedback_id, type, title, description, email, page, organization_id }: FeedbackNotificationRequest = await req.json();

    // Get all active supervisor emails
    const { data: supervisors, error: supError } = await supabase
      .from('supervisors')
      .select('email')
      .eq('is_active', true);

    if (supError || !supervisors || supervisors.length === 0) {
      console.error('No active supervisors found:', supError);
      return new Response(JSON.stringify({ error: 'No active supervisors found' }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get organization name if provided
    let orgName = 'Unknown';
    if (organization_id) {
      const { data: org } = await supabase
        .from('organizations')
        .select('name')
        .eq('id', organization_id)
        .single();
      if (org) orgName = org.name;
    }

    const typeLabel = typeLabels[type] || type;
    const subject = `[CabinBuddy Feedback] ${typeLabel}: ${title}`;

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; line-height: 1.6;">
        <h2 style="color: #2d5d2d; border-bottom: 2px solid #2d5d2d; padding-bottom: 10px;">
          ${typeLabel}
        </h2>
        
        <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <h3 style="margin-top: 0;">${title}</h3>
          <p>${description.replace(/\n/g, '<br>')}</p>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 14px;">
          <tr>
            <td style="padding: 6px 12px; font-weight: bold; color: #666;">Organization:</td>
            <td style="padding: 6px 12px;">${orgName}</td>
          </tr>
          ${email ? `<tr>
            <td style="padding: 6px 12px; font-weight: bold; color: #666;">Submitter Email:</td>
            <td style="padding: 6px 12px;">${email}</td>
          </tr>` : ''}
          ${page ? `<tr>
            <td style="padding: 6px 12px; font-weight: bold; color: #666;">Page:</td>
            <td style="padding: 6px 12px;">${page}</td>
          </tr>` : ''}
          <tr>
            <td style="padding: 6px 12px; font-weight: bold; color: #666;">Feedback ID:</td>
            <td style="padding: 6px 12px; font-family: monospace; font-size: 12px;">${feedback_id}</td>
          </tr>
        </table>

        <p style="font-size: 13px; color: #888; margin-top: 24px;">
          View and manage this feedback in the <strong>Supervisor Dashboard → Feedback Inbox</strong> tab.
        </p>
      </div>
    `;

    const supervisorEmails = supervisors.map(s => s.email).filter(Boolean);
    console.log(`Sending feedback notification to ${supervisorEmails.length} supervisor(s)`);

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "CabinBuddy <onboarding@resend.dev>",
        to: supervisorEmails,
        subject,
        html: htmlContent,
      }),
    });

    const emailResult = await emailResponse.json();

    console.log("Email result:", JSON.stringify(emailResult));

    return new Response(JSON.stringify({ success: true, emailResult }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error sending feedback notification:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
