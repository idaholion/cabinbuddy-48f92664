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

interface Recipient {
  email?: string;
  phone?: string;
  name?: string;
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

// Find phone number for a specific email from a family group's host_members
function findPhoneFromHostMembers(group: any, email: string): string | undefined {
  if (!group?.host_members) return undefined;
  const members = Array.isArray(group.host_members) ? group.host_members : JSON.parse(group.host_members as string);
  const member = members.find((m: any) => m.email === email);
  return member?.phone;
}

// Find contact info for a specific person by name from a family group's host_members
function findMemberByName(group: any, name: string): Recipient {
  if (!group?.host_members) return {};
  const members = Array.isArray(group.host_members) ? group.host_members : JSON.parse(group.host_members as string);
  // Try exact match first, then case-insensitive
  const member = members.find((m: any) => m.name === name) || 
                 members.find((m: any) => m.name?.toLowerCase() === name?.toLowerCase());
  if (member) {
    return { email: member.email, phone: member.phone, name: member.name };
  }
  return {};
}

// Send an email + SMS to a single recipient
async function sendToRecipient(
  recipient: Recipient,
  subject: string,
  htmlContent: string,
  smsMessage: string,
  fromName: string
) {
  if (recipient.email) {
    try {
      await resend.emails.send({
        from: `${fromName} <notifications@cabinbuddy.org>`,
        to: [recipient.email],
        subject,
        html: htmlContent,
      });
      console.log(`✅ Email sent to: ${recipient.email} (${recipient.name || 'unknown'})`);
    } catch (error) {
      console.error(`❌ Error sending email to ${recipient.email}:`, error);
    }
  }
  if (recipient.phone) {
    await sendSMS(recipient.phone, smsMessage);
  }
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tradeRequestId, notificationType }: TradeNotificationRequest = await req.json();
    
    console.log(`Processing trade notification for request: ${tradeRequestId}, type: ${notificationType}`);

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

    // Get family group details to look up phone numbers
    const { data: familyGroups, error: familyError } = await supabaseClient
      .from('family_groups')
      .select('*')
      .eq('organization_id', tradeRequest.organization_id)
      .in('name', [tradeRequest.requester_family_group, tradeRequest.target_family_group]);

    if (familyError) {
      console.error('Error fetching family groups:', familyError);
      throw new Error('Family groups not found');
    }

    const requesterGroup = familyGroups.find((fg: any) => fg.name === tradeRequest.requester_family_group);
    const targetGroup = familyGroups.find((fg: any) => fg.name === tradeRequest.target_family_group);

    const orgName = tradeRequest.organization.name;

    // Build the specific requester recipient
    // Use requester_email from trade_requests if available, otherwise fall back to looking up by requester_name
    let requesterRecipient: Recipient = {};
    if (tradeRequest.requester_email) {
      const phone = findPhoneFromHostMembers(requesterGroup, tradeRequest.requester_email);
      requesterRecipient = { 
        email: tradeRequest.requester_email, 
        phone, 
        name: tradeRequest.requester_name || tradeRequest.requester_family_group 
      };
    } else if (tradeRequest.requester_name) {
      requesterRecipient = findMemberByName(requesterGroup, tradeRequest.requester_name);
      if (!requesterRecipient.email) {
        // Fall back to group lead
        requesterRecipient = { 
          email: requesterGroup?.lead_email, 
          phone: requesterGroup?.lead_phone, 
          name: tradeRequest.requester_name 
        };
      }
    } else {
      // Final fallback: group lead
      requesterRecipient = { 
        email: requesterGroup?.lead_email, 
        phone: requesterGroup?.lead_phone, 
        name: tradeRequest.requester_family_group 
      };
    }

    // Build the specific target host recipient
    let targetRecipient: Recipient = {};
    if (tradeRequest.target_host_email) {
      const phone = findPhoneFromHostMembers(targetGroup, tradeRequest.target_host_email);
      targetRecipient = { 
        email: tradeRequest.target_host_email, 
        phone, 
        name: tradeRequest.target_host_name || tradeRequest.target_family_group 
      };
    } else if (tradeRequest.target_host_name) {
      targetRecipient = findMemberByName(targetGroup, tradeRequest.target_host_name);
      if (!targetRecipient.email) {
        targetRecipient = { 
          email: targetGroup?.lead_email, 
          phone: targetGroup?.lead_phone, 
          name: tradeRequest.target_host_name 
        };
      }
    } else {
      targetRecipient = { 
        email: targetGroup?.lead_email, 
        phone: targetGroup?.lead_phone, 
        name: tradeRequest.target_family_group 
      };
    }

    // Admin recipient
    const adminRecipient: Recipient = {
      email: tradeRequest.organization.admin_email || undefined,
      phone: tradeRequest.organization.admin_phone || undefined,
      name: tradeRequest.organization.admin_name || 'Admin'
    };

    const requesterDisplayName = tradeRequest.requester_name || tradeRequest.requester_family_group;
    const targetDisplayName = tradeRequest.target_host_name || tradeRequest.target_family_group;
    const requestedDates = `${new Date(tradeRequest.requested_start_date).toLocaleDateString()} - ${new Date(tradeRequest.requested_end_date).toLocaleDateString()}`;
    
    let totalSent = 0;

    switch (notificationType) {
      case 'request_created': {
        // 1. Notify the TARGET HOST
        const targetSubject = `Time Trade Request from ${requesterDisplayName}`;
        const targetHtml = `
          <h2>New Time Trade Request</h2>
          <p><strong>${requesterDisplayName}</strong> (${tradeRequest.requester_family_group}) has requested to trade for your ${requestedDates} reservation.</p>
          
          ${tradeRequest.request_type === 'trade_offer' && tradeRequest.offered_start_date ? `
            <h3>Offered in Return:</h3>
            <p>${new Date(tradeRequest.offered_start_date).toLocaleDateString()} to ${new Date(tradeRequest.offered_end_date).toLocaleDateString()}</p>
          ` : '<p><em>No time offered in return (request only)</em></p>'}
          
          ${tradeRequest.requester_message ? `
            <h3>Message:</h3>
            <p>${tradeRequest.requester_message}</p>
          ` : ''}
          
          <p>Please log in to your cabin management system to approve or reject this request.</p>
          <p>Best regards,<br>${orgName} Management</p>
        `;
        const targetSms = `New trade request from ${requesterDisplayName} for ${requestedDates}. Log in to respond. - ${orgName}`;
        
        await sendToRecipient(targetRecipient, targetSubject, targetHtml, targetSms, orgName);
        totalSent++;

        // 2. Send REQUESTER confirmation
        const requesterSubject = `Your Trade Request to ${targetDisplayName} Has Been Submitted`;
        const requesterHtml = `
          <h2>Your Trade Request Has Been Submitted</h2>
          <p>Your trade request to <strong>${targetDisplayName}</strong> (${tradeRequest.target_family_group}) for ${requestedDates} has been sent.</p>
          
          ${tradeRequest.request_type === 'trade_offer' && tradeRequest.offered_start_date ? `
            <h3>You Offered:</h3>
            <p>${new Date(tradeRequest.offered_start_date).toLocaleDateString()} to ${new Date(tradeRequest.offered_end_date).toLocaleDateString()}</p>
          ` : ''}
          
          <p>You will be notified when they respond.</p>
          <p>Best regards,<br>${orgName} Management</p>
        `;
        const requesterSms = `Your trade request to ${targetDisplayName} for ${requestedDates} has been submitted. You'll be notified when they respond. - ${orgName}`;
        
        // Only send if requester is different from target (avoid double-email)
        if (requesterRecipient.email !== targetRecipient.email) {
          await sendToRecipient(requesterRecipient, requesterSubject, requesterHtml, requesterSms, orgName);
          totalSent++;
        }

        // 3. Notify ADMIN (if different from requester and target)
        if (adminRecipient.email && adminRecipient.email !== requesterRecipient.email && adminRecipient.email !== targetRecipient.email) {
          const adminSubject = `FYI: Trade Request - ${requesterDisplayName} → ${targetDisplayName}`;
          const adminHtml = `
            <h2>Trade Request Submitted</h2>
            <p><strong>${requesterDisplayName}</strong> (${tradeRequest.requester_family_group}) has requested to trade with <strong>${targetDisplayName}</strong> (${tradeRequest.target_family_group}) for ${requestedDates}.</p>
            
            ${tradeRequest.request_type === 'trade_offer' && tradeRequest.offered_start_date ? `
              <h3>Offered in Return:</h3>
              <p>${new Date(tradeRequest.offered_start_date).toLocaleDateString()} to ${new Date(tradeRequest.offered_end_date).toLocaleDateString()}</p>
            ` : ''}
            
            <p><em>This is an informational copy for admin records.</em></p>
            <p>Best regards,<br>${orgName} Management</p>
          `;
          const adminSms = `FYI: Trade request from ${requesterDisplayName} to ${targetDisplayName} for ${requestedDates}. - ${orgName}`;
          await sendToRecipient(adminRecipient, adminSubject, adminHtml, adminSms, orgName);
          totalSent++;
        }
        break;
      }

      case 'request_approved': {
        // 1. Notify REQUESTER that their request was approved
        const approvedSubject = `Trade Request Approved by ${targetDisplayName}`;
        const approvedHtml = `
          <h2>Trade Request Approved!</h2>
          <p>Good news! <strong>${targetDisplayName}</strong> (${tradeRequest.target_family_group}) has approved your time trade request.</p>
          
          <h3>Approved Time:</h3>
          <p>${requestedDates}</p>
          
          ${tradeRequest.approver_message ? `
            <h3>Message from ${targetDisplayName}:</h3>
            <p>${tradeRequest.approver_message}</p>
          ` : ''}
          
          <p>Your calendar has been updated with the new reservation.</p>
          <p>Best regards,<br>${orgName} Management</p>
        `;
        const approvedSms = `Great news! ${targetDisplayName} approved your trade request for ${requestedDates}. Calendar updated. - ${orgName}`;
        
        await sendToRecipient(requesterRecipient, approvedSubject, approvedHtml, approvedSms, orgName);
        totalSent++;

        // 2. Confirmation to TARGET HOST
        const targetConfirmSubject = `Trade Request Approved - Confirmation`;
        const targetConfirmHtml = `
          <h2>You Approved a Trade Request</h2>
          <p>You have approved the trade request from <strong>${requesterDisplayName}</strong> (${tradeRequest.requester_family_group}) for ${requestedDates}.</p>
          <p>Your calendar has been updated.</p>
          <p>Best regards,<br>${orgName} Management</p>
        `;
        const targetConfirmSms = `You approved the trade request from ${requesterDisplayName} for ${requestedDates}. Calendar updated. - ${orgName}`;
        
        if (targetRecipient.email !== requesterRecipient.email) {
          await sendToRecipient(targetRecipient, targetConfirmSubject, targetConfirmHtml, targetConfirmSms, orgName);
          totalSent++;
        }

        // 3. Admin FYI
        if (adminRecipient.email && adminRecipient.email !== requesterRecipient.email && adminRecipient.email !== targetRecipient.email) {
          const adminSubject = `Trade Approved: ${requesterDisplayName} ↔ ${targetDisplayName}`;
          const adminHtml = `
            <h2>Trade Request Approved</h2>
            <p><strong>${targetDisplayName}</strong> approved the trade request from <strong>${requesterDisplayName}</strong> for ${requestedDates}. Calendar has been updated.</p>
            <p><em>This is an informational copy for admin records.</em></p>
            <p>Best regards,<br>${orgName} Management</p>
          `;
          const adminSms = `Trade approved: ${requesterDisplayName} ↔ ${targetDisplayName} for ${requestedDates}. - ${orgName}`;
          await sendToRecipient(adminRecipient, adminSubject, adminHtml, adminSms, orgName);
          totalSent++;
        }
        break;
      }

      case 'request_rejected': {
        // 1. Notify REQUESTER that their request was declined
        const rejectedSubject = `Trade Request Declined by ${targetDisplayName}`;
        const rejectedHtml = `
          <h2>Trade Request Declined</h2>
          <p><strong>${targetDisplayName}</strong> (${tradeRequest.target_family_group}) has declined your time trade request.</p>
          
          <h3>Requested Time:</h3>
          <p>${requestedDates}</p>
          
          ${tradeRequest.approver_message ? `
            <h3>Message from ${targetDisplayName}:</h3>
            <p>${tradeRequest.approver_message}</p>
          ` : ''}
          
          <p>You may submit another trade request if desired.</p>
          <p>Best regards,<br>${orgName} Management</p>
        `;
        const rejectedSms = `${targetDisplayName} declined your trade request for ${requestedDates}. - ${orgName}`;
        
        await sendToRecipient(requesterRecipient, rejectedSubject, rejectedHtml, rejectedSms, orgName);
        totalSent++;

        // 2. Confirmation to TARGET HOST
        const targetRejectSubject = `Trade Request Declined - Confirmation`;
        const targetRejectHtml = `
          <h2>Trade Request Declined - Confirmation</h2>
          <p>You have declined the trade request from <strong>${requesterDisplayName}</strong> (${tradeRequest.requester_family_group}) for ${requestedDates}.</p>
          <p>Best regards,<br>${orgName} Management</p>
        `;
        const targetRejectSms = `You declined the trade request from ${requesterDisplayName} for ${requestedDates}. - ${orgName}`;
        
        if (targetRecipient.email !== requesterRecipient.email) {
          await sendToRecipient(targetRecipient, targetRejectSubject, targetRejectHtml, targetRejectSms, orgName);
          totalSent++;
        }

        // 3. Admin FYI
        if (adminRecipient.email && adminRecipient.email !== requesterRecipient.email && adminRecipient.email !== targetRecipient.email) {
          const adminSubject = `Trade Declined: ${requesterDisplayName} → ${targetDisplayName}`;
          const adminHtml = `
            <h2>Trade Request Declined</h2>
            <p><strong>${targetDisplayName}</strong> declined the trade request from <strong>${requesterDisplayName}</strong> for ${requestedDates}.</p>
            <p><em>This is an informational copy for admin records.</em></p>
            <p>Best regards,<br>${orgName} Management</p>
          `;
          const adminSms = `Trade declined: ${requesterDisplayName} → ${targetDisplayName} for ${requestedDates}. - ${orgName}`;
          await sendToRecipient(adminRecipient, adminSubject, adminHtml, adminSms, orgName);
          totalSent++;
        }
        break;
      }

      case 'request_cancelled': {
        // Notify target host and admin that the request was cancelled
        const cancelledSubject = `Trade Request Cancelled by ${requesterDisplayName}`;
        const cancelledHtml = `
          <h2>Trade Request Cancelled</h2>
          <p><strong>${requesterDisplayName}</strong> (${tradeRequest.requester_family_group}) has cancelled their trade request for ${requestedDates}.</p>
          <p>No action is needed.</p>
          <p>Best regards,<br>${orgName} Management</p>
        `;
        const cancelledSms = `Trade request from ${requesterDisplayName} for ${requestedDates} has been cancelled. - ${orgName}`;
        
        await sendToRecipient(targetRecipient, cancelledSubject, cancelledHtml, cancelledSms, orgName);
        totalSent++;

        if (adminRecipient.email && adminRecipient.email !== targetRecipient.email && adminRecipient.email !== requesterRecipient.email) {
          await sendToRecipient(adminRecipient, `FYI: ${cancelledSubject}`, cancelledHtml, cancelledSms, orgName);
          totalSent++;
        }
        break;
      }

      default:
        throw new Error(`Unknown notification type: ${notificationType}`);
    }

    console.log(`✅ Trade notification complete. Total messages sent: ${totalSent}`);

    return new Response(JSON.stringify({ 
      success: true, 
      messagesSent: totalSent,
      tradeRequestId 
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
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
