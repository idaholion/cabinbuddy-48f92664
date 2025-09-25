import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TradeNotificationRequest {
  tradeRequestId: string;
  notificationType: 'request_created' | 'request_approved' | 'request_rejected' | 'request_cancelled';
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

    // Prepare email content based on notification type
    let emailSubject: string;
    let emailContent: string;
    let recipients: string[] = [];

    switch (notificationType) {
      case 'request_created':
        emailSubject = `Time Trade Request from ${tradeRequest.requester_family_group}`;
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
          recipients = hostMembers.map((member: any) => member.email).filter(Boolean);
        }
        if (tradeRequest.organization.admin_email) {
          recipients.push(tradeRequest.organization.admin_email);
        }
        break;

      case 'request_approved':
        emailSubject = `Trade Request Approved by ${tradeRequest.target_family_group}`;
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
          recipients = hostMembers.map((member: any) => member.email).filter(Boolean);
        }
        break;

      case 'request_rejected':
        emailSubject = `Trade Request Declined by ${tradeRequest.target_family_group}`;
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
          recipients = hostMembers.map((member: any) => member.email).filter(Boolean);
        }
        break;

      default:
        throw new Error(`Unknown notification type: ${notificationType}`);
    }

    // Send emails to all recipients
    const emailPromises = recipients.map(async (email) => {
      const emailResponse = await resend.emails.send({
        from: `${tradeRequest.organization.name} <noreply@lovable.app>`,
        to: [email],
        subject: emailSubject,
        html: emailContent,
      });

      // Log the notification
      await supabaseClient
        .from('trade_notifications')
        .insert({
          trade_request_id: tradeRequestId,
          recipient_family_group: email.includes('@') ? 'admin' : (recipients === targetGroup?.host_members?.map((m: any) => m.email) ? tradeRequest.target_family_group : tradeRequest.requester_family_group),
          recipient_email: email,
          notification_type: notificationType,
          organization_id: tradeRequest.organization_id,
          sent_at: new Date().toISOString()
        });

      return emailResponse;
    });

    const results = await Promise.allSettled(emailPromises);
    
    console.log(`Sent ${results.length} trade notification emails`);

    return new Response(JSON.stringify({ 
      success: true, 
      emailsSent: results.length,
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