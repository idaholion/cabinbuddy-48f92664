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
        organization:organizations(name, admin_email, admin_name, admin_phone)
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

    // Helper: find phone number for a specific email from a family group's host_members
    function findPhoneFromHostMembers(group: any, email: string): string | undefined {
      if (!group?.host_members) return undefined;
      const members = Array.isArray(group.host_members) ? group.host_members : JSON.parse(group.host_members as string);
      const member = members.find((m: any) => m.email === email);
      return member?.phone;
    }

    // Helper: get all host members with email and phone from a family group
    function getHostMemberRecipients(group: any): { email?: string; phone?: string; name?: string }[] {
      if (!group?.host_members) return [];
      const members = Array.isArray(group.host_members) ? group.host_members : JSON.parse(group.host_members as string);
      return members.map((member: any) => ({
        email: member.email,
        phone: member.phone,
        name: member.name
      })).filter((r: any) => r.email || r.phone);
    }

    // Prepare email content and SMS messages based on notification type
    let emailSubject: string;
    let emailContent: string;
    let smsMessage: string;
    let recipients: { email?: string; phone?: string; name?: string }[] = [];

    switch (notificationType) {
      case 'request_created':
        // Smart routing: Primary notification goes to specific host if available
        const hasSpecificHost = tradeRequest.target_host_email;
        const hostName = tradeRequest.target_host_name || tradeRequest.target_family_group;
        
        emailSubject = `Time Trade Request from ${tradeRequest.requester_family_group}`;
        smsMessage = `New trade request from ${tradeRequest.requester_family_group} for ${new Date(tradeRequest.requested_start_date).toLocaleDateString()}-${new Date(tradeRequest.requested_end_date).toLocaleDateString()}. Check your email or login to respond. - ${tradeRequest.organization.name}`;
        
        // Primary email content for the target host
        emailContent = `
          <h2>New Time Trade Request</h2>
          <p><strong>${tradeRequest.requester_family_group}</strong> has requested to trade for your ${new Date(tradeRequest.requested_start_date).toLocaleDateString()} - ${new Date(tradeRequest.requested_end_date).toLocaleDateString()} reservation.</p>
          
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
        
        // Build recipient list for TARGET
        if (hasSpecificHost) {
          // Find the host's phone from the target group's host_members
          const hostPhone = findPhoneFromHostMembers(targetGroup, tradeRequest.target_host_email);
          recipients.push({
            email: tradeRequest.target_host_email,
            phone: hostPhone,
            name: hostName
          });
          
          // CC: Send FYI to group lead (if different from host)
          if (targetGroup?.lead_email && targetGroup.lead_email !== tradeRequest.target_host_email) {
            const ccEmailContent = `
              <h2>FYI: Trade Request for ${hostName}</h2>
              <p><strong>${tradeRequest.requester_family_group}</strong> has requested to trade with <strong>${hostName}</strong> for their ${new Date(tradeRequest.requested_start_date).toLocaleDateString()} - ${new Date(tradeRequest.requested_end_date).toLocaleDateString()} reservation.</p>
              
              <p><em>This is an informational copy. ${hostName} has been notified directly.</em></p>
              
              ${tradeRequest.request_type === 'trade_offer' && tradeRequest.offered_start_date ? `
                <h3>Offered in Return:</h3>
                <p>${new Date(tradeRequest.offered_start_date).toLocaleDateString()} to ${new Date(tradeRequest.offered_end_date).toLocaleDateString()}</p>
              ` : ''}
              
              ${tradeRequest.requester_message ? `
                <h3>Message:</h3>
                <p>${tradeRequest.requester_message}</p>
              ` : ''}
              
              <p>Best regards,<br>
              ${tradeRequest.organization.name} Management</p>
            `;
            
            try {
              await resend.emails.send({
                from: `${tradeRequest.organization.name} <notifications@cabinbuddy.org>`,
                to: [targetGroup.lead_email],
                subject: `FYI: ${emailSubject}`,
                html: ccEmailContent,
              });
              console.log(`Sent CC email to group lead: ${targetGroup.lead_email}`);
            } catch (ccError) {
              console.error('Error sending CC email to group lead:', ccError);
            }
          }
        } else {
          // Fallback: No specific host, send to all target host members
          recipients = getHostMemberRecipients(targetGroup);
        }
        
        // Add REQUESTER confirmation (email + SMS)
        const requesterConfirmationContent = `
          <h2>Your Trade Request Has Been Submitted</h2>
          <p>Your trade request to <strong>${tradeRequest.target_family_group}</strong> for ${new Date(tradeRequest.requested_start_date).toLocaleDateString()} - ${new Date(tradeRequest.requested_end_date).toLocaleDateString()} has been sent.</p>
          
          ${tradeRequest.request_type === 'trade_offer' && tradeRequest.offered_start_date ? `
            <h3>You Offered:</h3>
            <p>${new Date(tradeRequest.offered_start_date).toLocaleDateString()} to ${new Date(tradeRequest.offered_end_date).toLocaleDateString()}</p>
          ` : ''}
          
          <p>You will be notified when they respond.</p>
          
          <p>Best regards,<br>
          ${tradeRequest.organization.name} Management</p>
        `;
        const requesterSmsMessage = `Your trade request to ${tradeRequest.target_family_group} for ${new Date(tradeRequest.requested_start_date).toLocaleDateString()}-${new Date(tradeRequest.requested_end_date).toLocaleDateString()} has been submitted. You'll be notified when they respond. - ${tradeRequest.organization.name}`;
        
        // Send requester confirmation emails and SMS
        const requesterRecipients = getHostMemberRecipients(requesterGroup);
        for (const requester of requesterRecipients) {
          if (requester.email) {
            try {
              await resend.emails.send({
                from: `${tradeRequest.organization.name} <notifications@cabinbuddy.org>`,
                to: [requester.email],
                subject: `Your Trade Request to ${tradeRequest.target_family_group} Has Been Submitted`,
                html: requesterConfirmationContent,
              });
              console.log(`Sent requester confirmation email to: ${requester.email}`);
            } catch (reqError) {
              console.error('Error sending requester confirmation email:', reqError);
            }
          }
          if (requester.phone) {
            await sendSMS(requester.phone, requesterSmsMessage);
          }
        }
        
        // Always CC organization admin (with phone for SMS)
        if (tradeRequest.organization.admin_email) {
          // Only add admin if not already a recipient
          const adminAlreadyIncluded = recipients.some(r => r.email === tradeRequest.organization.admin_email);
          if (!adminAlreadyIncluded) {
            recipients.push({
              email: tradeRequest.organization.admin_email,
              phone: tradeRequest.organization.admin_phone || undefined,
              name: tradeRequest.organization.admin_name
            });
          }
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
        from: `${tradeRequest.organization.name} <notifications@cabinbuddy.org>`,
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