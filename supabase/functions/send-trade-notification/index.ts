import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

// Twilio configuration
const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN");
const twilioPhoneNumber = Deno.env.get("TWILIO_PHONE_NUMBER");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TradeNotificationRequest {
  tradeRequestId: string;
  notificationType: 'request_created' | 'request_approved' | 'request_rejected' | 'request_cancelled';
}

async function sendSMS(to: string, message: string) {
  console.log(`🔄 Sending SMS to ${to}: ${message}`);
  
  if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
    console.log("❌ Twilio credentials not configured, skipping SMS");
    return null;
  }

  const auth = btoa(`${twilioAccountSid}:${twilioAuthToken}`);
  const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;

  const body = new URLSearchParams({
    From: twilioPhoneNumber,
    To: to,
    Body: message
  });

  try {
    const response = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString()
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Twilio SMS error:", errorText);
      throw new Error(`SMS failed: ${response.status}`);
    }

    const responseData = await response.json();
    console.log("✅ SMS sent successfully! SID:", responseData.sid);
    return responseData;
  } catch (error) {
    console.error("❌ Error sending SMS:", error);
    return null;
  }
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tradeRequestId, notificationType }: TradeNotificationRequest = await req.json();
    
    console.log(`Processing trade notification for request: ${tradeRequestId}, type: ${notificationType}`);

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get trade request details
    const { data: tradeRequest, error: tradeError } = await supabaseClient
      .from('trade_requests')
      .select(`
        *,
        organization:organizations(name, admin_email, admin_name)
      `)
      .eq('id', tradeRequestId)
      .single();

    if (tradeError || !tradeRequest) {
      console.error('Error fetching trade request:', tradeError);
      throw new Error('Trade request not found');
    }

    // Get family group details for email addresses
    const { data: familyGroups, error: familyError } = await supabaseClient
      .from('family_groups')
      .select('*')
      .eq('organization_id', tradeRequest.organization_id)
      .in('name', [tradeRequest.requester_family_group, tradeRequest.target_family_group]);

    if (familyError) {
      console.error('Error fetching family groups:', familyError);
      throw new Error('Family groups not found');
    }

    const requesterGroup = familyGroups.find(fg => fg.name === tradeRequest.requester_family_group);
    const targetGroup = familyGroups.find(fg => fg.name === tradeRequest.target_family_group);

    // Prepare email content and SMS messages based on notification type
    let emailSubject: string;
    let emailContent: string;
    let smsMessage: string;
    let recipients: { email?: string; phone?: string; name?: string }[] = [];

    switch (notificationType) {
      case 'request_created':
        emailSubject = `Time Trade Request from ${tradeRequest.requester_family_group}`;
        smsMessage = `New trade request from ${tradeRequest.requester_family_group} for ${new Date(tradeRequest.requested_start_date).toLocaleDateString()}-${new Date(tradeRequest.requested_end_date).toLocaleDateString()}. Check your email or login to respond. - ${tradeRequest.organization.name}`;
        emailContent = `
          <h2>New Time Trade Request</h2>
          <p><strong>${tradeRequest.requester_family_group}</strong> has requested time from your group.</p>
          
          <h3>Requested Time:</h3>
          <p>${new Date(tradeRequest.requested_start_date).toLocaleDateString()} to ${new Date(tradeRequest.requested_end_date).toLocaleDateString()}</p>
          
          ${tradeRequest.request_type === 'trade_offer' && tradeRequest.offered_start_date ? `
            <h3>Offered in Return:</h3>
            <p>${new Date(tradeRequest.offered_start_date).toLocaleDateString()} to ${new Date(tradeRequest.offered_end_date).toLocaleDateString()}</p>
          ` : '<p><em>No time offered in return (request only)</em></p>'}
          
          ${tradeRequest.requester_message ? `
            <h3>Message:</h3>
            <p>${tradeRequest.requester_message}</p>
          ` : ''}
          
          <p>Please log in to your cabin management system to approve or reject this request.</p>
          
          <p>Best regards,<br>
          ${tradeRequest.organization.name} Management</p>
        `;
        
        // Send to target group host members and organization admin
        if (targetGroup?.host_members) {
          const hostMembers = Array.isArray(targetGroup.host_members) ? targetGroup.host_members : JSON.parse(targetGroup.host_members as string);
          recipients = hostMembers.map((member: any) => ({
            email: member.email,
            phone: member.phone,
            name: member.name
          })).filter((r: any) => r.email || r.phone);
        }
        if (tradeRequest.organization.admin_email) {
          recipients.push({
            email: tradeRequest.organization.admin_email,
            name: tradeRequest.organization.admin_name
          });
        }
        break;

      case 'request_approved':
        emailSubject = `Trade Request Approved by ${tradeRequest.target_family_group}`;
        smsMessage = `Great news! ${tradeRequest.target_family_group} approved your trade request for ${new Date(tradeRequest.requested_start_date).toLocaleDateString()}-${new Date(tradeRequest.requested_end_date).toLocaleDateString()}. Check your email for details. - ${tradeRequest.organization.name}`;
        emailContent = `
          <h2>Trade Request Approved!</h2>
          <p>Good news! <strong>${tradeRequest.target_family_group}</strong> has approved your time trade request.</p>
          
          <h3>Approved Time:</h3>
          <p>${new Date(tradeRequest.requested_start_date).toLocaleDateString()} to ${new Date(tradeRequest.requested_end_date).toLocaleDateString()}</p>
          
          ${tradeRequest.approver_message ? `
            <h3>Message from ${tradeRequest.target_family_group}:</h3>
            <p>${tradeRequest.approver_message}</p>
          ` : ''}
          
          <p>Your calendar has been updated with the new reservation.</p>
          
          <p>Best regards,<br>
          ${tradeRequest.organization.name} Management</p>
        `;
        
        // Send to requester group host members
        if (requesterGroup?.host_members) {
          const hostMembers = Array.isArray(requesterGroup.host_members) ? requesterGroup.host_members : JSON.parse(requesterGroup.host_members as string);
          recipients = hostMembers.map((member: any) => ({
            email: member.email,
            phone: member.phone,
            name: member.name
          })).filter((r: any) => r.email || r.phone);
        }
        break;

      case 'request_rejected':
        emailSubject = `Trade Request Declined by ${tradeRequest.target_family_group}`;
        smsMessage = `${tradeRequest.target_family_group} declined your trade request for ${new Date(tradeRequest.requested_start_date).toLocaleDateString()}-${new Date(tradeRequest.requested_end_date).toLocaleDateString()}. Check your email for details. - ${tradeRequest.organization.name}`;
        emailContent = `
          <h2>Trade Request Declined</h2>
          <p><strong>${tradeRequest.target_family_group}</strong> has declined your time trade request.</p>
          
          <h3>Requested Time:</h3>
          <p>${new Date(tradeRequest.requested_start_date).toLocaleDateString()} to ${new Date(tradeRequest.requested_end_date).toLocaleDateString()}</p>
          
          ${tradeRequest.approver_message ? `
            <h3>Message from ${tradeRequest.target_family_group}:</h3>
            <p>${tradeRequest.approver_message}</p>
          ` : ''}
          
          <p>You may submit another trade request if desired.</p>
          
          <p>Best regards,<br>
          ${tradeRequest.organization.name} Management</p>
        `;
        
        // Send to requester group host members
        if (requesterGroup?.host_members) {
          const hostMembers = Array.isArray(requesterGroup.host_members) ? requesterGroup.host_members : JSON.parse(requesterGroup.host_members as string);
          recipients = hostMembers.map((member: any) => ({
            email: member.email,
            phone: member.phone,
            name: member.name
          })).filter((r: any) => r.email || r.phone);
        }
        break;

      default:
        throw new Error(`Unknown notification type: ${notificationType}`);
    }

    // Send emails and SMS to all recipients
    const emailPromises = recipients.filter(r => r.email).map(async (recipient) => {
      const emailResponse = await resend.emails.send({
        from: `${tradeRequest.organization.name} <noreply@lovable.app>`,
        to: [recipient.email!],
        subject: emailSubject,
        html: emailContent,
      });

      // Log the notification
      await supabaseClient
        .from('trade_notifications')
        .insert({
          trade_request_id: tradeRequestId,
          recipient_family_group: recipient.email!.includes('@') ? 'admin' : (recipients === targetGroup?.host_members?.map((m: any) => ({ email: m.email, phone: m.phone, name: m.name })) ? tradeRequest.target_family_group : tradeRequest.requester_family_group),
          recipient_email: recipient.email!,
          notification_type: notificationType,
          organization_id: tradeRequest.organization_id,
          sent_at: new Date().toISOString()
        });

      return emailResponse;
    });

    // Send SMS messages
    const smsPromises = recipients.filter(r => r.phone).map(async (recipient) => {
      return await sendSMS(recipient.phone!, smsMessage);
    });

    const [emailResults, smsResults] = await Promise.allSettled([
      Promise.allSettled(emailPromises),
      Promise.allSettled(smsPromises)
    ]);
    
    console.log(`Sent ${emailPromises.length} trade notification emails and ${smsPromises.length} SMS messages`);

    return new Response(JSON.stringify({ 
      success: true, 
      emailsSent: emailPromises.length,
      smsSent: smsPromises.length,
      tradeRequestId 
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-trade-notification function:", error);
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