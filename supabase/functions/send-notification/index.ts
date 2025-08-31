import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Twilio configuration with enhanced logging
const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN");
const twilioPhoneNumber = Deno.env.get("TWILIO_PHONE_NUMBER");

// Debug logging for Twilio configuration
console.log("🔧 Twilio Configuration Check:");
console.log("  - Account SID:", twilioAccountSid ? `Present (${twilioAccountSid.substring(0, 8)}...)` : "❌ Missing");
console.log("  - Auth Token:", twilioAuthToken ? `Present (${twilioAuthToken.substring(0, 8)}...)` : "❌ Missing");
console.log("  - Phone Number:", twilioPhoneNumber ? `Present (${twilioPhoneNumber})` : "❌ Missing");
console.log("  - All credentials present:", !!(twilioAccountSid && twilioAuthToken && twilioPhoneNumber));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  type: 'reminder' | 'confirmation' | 'cancellation' | 'assistance_request' | 'selection_period';
  reservation?: {
    id: string;
    family_group_name: string;
    check_in_date: string;
    check_out_date: string;
    guest_email: string;
    guest_name: string;
    guest_phone?: string;
  };
  organization_id: string;
  days_until?: number;
  pre_arrival_checklist?: {
    seven_day?: string[];
    three_day?: string[];
    one_day?: string[];
  };
  // For selection period notifications
  selection_data?: {
    family_group_name: string;
    guest_email: string;
    guest_name: string;
    selection_year: string;
    selection_start_date: string;
    selection_end_date: string;
    available_periods: string;
  };
}

async function sendSMS(to: string, message: string) {
  console.log("🔄 SMS Sending Attempt:");
  console.log("  - Recipient:", to);
  console.log("  - Message length:", message.length, "characters");
  console.log("  - From number:", twilioPhoneNumber);
  
  if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
    console.log("❌ Twilio credentials not configured, skipping SMS");
    console.log("  - Missing:", {
      accountSid: !twilioAccountSid,
      authToken: !twilioAuthToken,
      phoneNumber: !twilioPhoneNumber
    });
    return null;
  }

  try {
    console.log("✅ All Twilio credentials present, attempting to send SMS...");
    const auth = btoa(`${twilioAccountSid}:${twilioAuthToken}`);
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
    
    console.log("  - Twilio API URL:", twilioUrl);
    
    const requestBody = new URLSearchParams({
      From: twilioPhoneNumber,
      To: to,
      Body: message,
    });
    
    console.log("  - Request body prepared");
    
    const response = await fetch(twilioUrl, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: requestBody,
    });

    console.log("  - Response status:", response.status);
    console.log("  - Response status text:", response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Twilio SMS error response:", errorText);
      console.error("  - Status code:", response.status);
      console.error("  - Status text:", response.statusText);
      return { error: errorText };
    }

    const result = await response.json();
    console.log("✅ SMS sent successfully!");
    console.log("  - Message SID:", result.sid);
    console.log("  - Status:", result.status);
    return result;
  } catch (error) {
    console.error("❌ Exception while sending SMS:", error);
    console.error("  - Error name:", error.name);
    console.error("  - Error message:", error.message);
    console.error("  - Error stack:", error.stack);
    return { error: error.message };
  }
}

function replaceVariables(template: string, variables: { [key: string]: string }) {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{${key}}}`, 'g');
    result = result.replace(regex, value);
  }
  return result;
}

async function getTemplate(organizationId: string, reminderType: string) {
  try {
    const { data, error } = await supabase
      .from('reminder_templates')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('reminder_type', reminderType)
      .single();

    if (error) {
      console.log(`No custom template found for ${reminderType}, using default`);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error fetching template:', error);
    return null;
  }
}

async function getOrganizationName(organizationId: string): Promise<string> {
  try {
    const { data, error } = await supabase
      .from('organizations')
      .select('name')
      .eq('id', organizationId)
      .single();

    if (error) {
      console.error('Error fetching organization name:', error);
      return 'CabinBuddy';
    }

    return data.name || 'CabinBuddy';
  } catch (error) {
    console.error('Error fetching organization name:', error);
    return 'CabinBuddy';
  }
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, reservation, organization_id, days_until, selection_data }: NotificationRequest = await req.json();

    let subject = "";
    let htmlContent = "";
    let smsMessage = "";
    
    const organizationName = await getOrganizationName(organization_id);

    switch (type) {
      case 'reminder':
        if (!reservation) throw new Error('Reservation data required for reminder');
        
        // Determine reminder type based on days_until
        let reminderType = 'stay_1_day';
        if (days_until === 7) reminderType = 'stay_7_day';
        else if (days_until === 3) reminderType = 'stay_3_day';
        
        const template = await getTemplate(organization_id, reminderType);
        
        const variables = {
          guest_name: reservation.guest_name,
          family_group_name: reservation.family_group_name,
          check_in_date: new Date(reservation.check_in_date).toLocaleDateString(),
          check_out_date: new Date(reservation.check_out_date).toLocaleDateString(),
          organization_name: organizationName,
          reservation_id: reservation.id,
          reservation_detail_url: `https://lovable.dev/projects/ftaxzdnrnhktzbcsejoy/reservation/${reservation.id}`,
        };

        if (template) {
          // Use custom template
          subject = replaceVariables(template.subject_template, variables);
          
          const customMessage = replaceVariables(template.custom_message, variables);
          const checklistItems = template.checklist_items || [];
          
          const checklistHtml = checklistItems.length > 0 ? `
            <div style="background: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #2d5d2d; margin-top: 0;">📋 Pre-Arrival Checklist (${days_until} day${days_until !== 1 ? 's' : ''} out)</h3>
              <ul style="margin: 10px 0; padding-left: 20px;">
                ${checklistItems.map(item => `<li style="margin-bottom: 8px;">${item}</li>`).join('')}
              </ul>
              <p style="font-size: 14px; color: #666; margin-bottom: 0;"><em>💡 Tip: You can access your shopping list and documents in the cabin management system!</em></p>
            </div>
          ` : '';
          
          htmlContent = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; line-height: 1.6;">
              ${customMessage.split('\n').map(line => `<p>${line}</p>`).join('')}
              ${checklistHtml}
            </div>
          `;
        } else {
          // Use default template with checklist based on days_until
          subject = `Cabin Reservation Reminder - ${days_until} day${days_until !== 1 ? 's' : ''} to go!`;
          
          // Default checklists based on days until arrival
          let defaultChecklistItems: string[] = [];
          if (days_until === 7) {
            defaultChecklistItems = [
              'Review shopping list and coordinate with other families',
              'Check weather forecast for packing',
              'Share guest information packet with friends/family joining',
              'Review cabin rules and policies',
              'Plan transportation and confirm directions'
            ];
          } else if (days_until === 3) {
            defaultChecklistItems = [
              'Final review of shopping list',
              'Confirm arrival time with calendar keeper if needed',
              'Pack according to weather forecast',
              'Double-check emergency contact information',
              'Review check-in procedures'
            ];
          } else if (days_until === 1) {
            defaultChecklistItems = [
              'Final weather check and packing adjustments',
              'Confirm departure time and route',
              'Ensure all guests have cabin address and WiFi info',
              'Last-minute coordination with other families',
              'Emergency contacts saved in phone'
            ];
          }
          
          const defaultChecklistHtml = defaultChecklistItems.length > 0 ? `
            <div style="background: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #2d5d2d; margin-top: 0;">📋 Pre-Arrival Checklist (${days_until} day${days_until !== 1 ? 's' : ''} out)</h3>
              <ul style="margin: 10px 0; padding-left: 20px;">
                ${defaultChecklistItems.map(item => `<li style="margin-bottom: 8px;">${item}</li>`).join('')}
              </ul>
              <p style="font-size: 14px; color: #666; margin-bottom: 0;"><em>💡 Tip: You can access your shopping list and documents in the cabin management system!</em></p>
            </div>
          ` : '';
          
          htmlContent = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; line-height: 1.6;">
              <h1 style="color: #2d5d2d; text-align: center;">🏡 Your Cabin Reservation is Coming Up!</h1>
              <p>Hi ${reservation.guest_name},</p>
              <p>Just a friendly reminder that your cabin reservation is in <strong>${days_until} day${days_until !== 1 ? 's' : ''}</strong>! Time to start getting excited and prepared.</p>
              
              <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin-top: 0;">🏷️ Reservation Details:</h3>
                <p><strong>Family Group:</strong> ${reservation.family_group_name}</p>
                <p><strong>Check-in:</strong> ${new Date(reservation.check_in_date).toLocaleDateString()}</p>
                <p><strong>Check-out:</strong> ${new Date(reservation.check_out_date).toLocaleDateString()}</p>
                 <p><strong>Reservation ID:</strong> ${reservation.id}</p>
                 <p><strong><a href="https://lovable.dev/projects/ftaxzdnrnhktzbcsejoy/reservation/${reservation.id}" style="color: #2d5d2d; text-decoration: none; background: #e8f5e8; padding: 8px 16px; border-radius: 4px; display: inline-block; margin-top: 8px;">🔗 View Reservation Details</a></strong></p>
              </div>
              
              ${defaultChecklistHtml}
              
              <p>We're looking forward to your stay and hope you have a wonderful time!</p>
              <p style="margin-top: 30px;">Best regards,<br><strong>${organizationName} Team</strong></p>
            </div>
          `;
        }
        
        smsMessage = `Hi ${reservation.guest_name}! Your cabin reservation (${reservation.family_group_name}) is in ${days_until} day${days_until !== 1 ? 's' : ''}. Check-in: ${new Date(reservation.check_in_date).toLocaleDateString()}. Check your email for details. - ${organizationName}`;
        break;

      case 'selection_period':
        if (!selection_data) throw new Error('Selection data required for selection period notification');
        
        const selectionTemplate = await getTemplate(organization_id, 'selection_period_start');
        
        const selectionVariables = {
          guest_name: selection_data.guest_name,
          family_group_name: selection_data.family_group_name,
          selection_year: selection_data.selection_year,
          selection_start_date: selection_data.selection_start_date,
          selection_end_date: selection_data.selection_end_date,
          available_periods: selection_data.available_periods,
          organization_name: organizationName,
        };

        if (selectionTemplate) {
          subject = replaceVariables(selectionTemplate.subject_template, selectionVariables);
          
          const customMessage = replaceVariables(selectionTemplate.custom_message, selectionVariables);
          const checklistItems = selectionTemplate.checklist_items || [];
          
          const checklistHtml = checklistItems.length > 0 ? `
            <div style="background: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #1565c0; margin-top: 0;">📋 Selection Checklist</h3>
              <ul style="margin: 10px 0; padding-left: 20px;">
                ${checklistItems.map(item => `<li style="margin-bottom: 8px;">${item}</li>`).join('')}
              </ul>
            </div>
          ` : '';
          
          htmlContent = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; line-height: 1.6;">
              ${customMessage.split('\n').map(line => `<p>${line}</p>`).join('')}
              ${checklistHtml}
            </div>
          `;
        } else {
          // Default selection period template
          subject = `Calendar Selection Period Now Open - ${selection_data.selection_year}`;
          htmlContent = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; line-height: 1.6;">
              <h1 style="color: #2d5d2d; text-align: center;">📅 Time to Select Your Cabin Dates!</h1>
              <p>Hi ${selection_data.guest_name},</p>
              <p>The calendar selection period for <strong>${selection_data.selection_year}</strong> is now open!</p>
              
              <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin-top: 0;">📋 Selection Details:</h3>
                <p><strong>Family Group:</strong> ${selection_data.family_group_name}</p>
                <p><strong>Selection Period:</strong> ${selection_data.selection_start_date} to ${selection_data.selection_end_date}</p>
                <p><strong>Available Periods:</strong> ${selection_data.available_periods}</p>
              </div>
              
              <p>Please log into the cabin management system to make your selections as soon as possible.</p>
              <p style="margin-top: 30px;">Best regards,<br><strong>${organizationName} Calendar Keeper</strong></p>
            </div>
          `;
        }
        
        smsMessage = `Hi ${selection_data.guest_name}! Calendar selection for ${selection_data.selection_year} is now open. Please make your selections by ${selection_data.selection_end_date}. - ${organizationName}`;
        break;
      
      // Keep existing cases for confirmation, cancellation, assistance_request...
      case 'confirmation':
        if (!reservation) throw new Error('Reservation data required for confirmation');
        subject = `Cabin Reservation Confirmed - ${reservation.family_group_name}`;
        smsMessage = `Hi ${reservation.guest_name}! Your cabin reservation (${reservation.family_group_name}) is confirmed. Check-in: ${new Date(reservation.check_in_date).toLocaleDateString()}. - ${organizationName}`;
        htmlContent = `
          <h1>Your Cabin Reservation is Confirmed!</h1>
          <p>Hi ${reservation.guest_name},</p>
          <p>Great news! Your cabin reservation has been confirmed.</p>
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>Reservation Details:</h3>
            <p><strong>Family Group:</strong> ${reservation.family_group_name}</p>
            <p><strong>Check-in:</strong> ${new Date(reservation.check_in_date).toLocaleDateString()}</p>
            <p><strong>Check-out:</strong> ${new Date(reservation.check_out_date).toLocaleDateString()}</p>
             <p><strong>Reservation ID:</strong> ${reservation.id}</p>
             <p><strong><a href="https://lovable.dev/projects/ftaxzdnrnhktzbcsejoy/reservation/${reservation.id}" style="color: #2d5d2d; text-decoration: none; background: #e8f5e8; padding: 8px 16px; border-radius: 4px; display: inline-block; margin-top: 8px;">🔗 View Reservation Details</a></strong></p>
          </div>
          <p>You'll receive reminder notifications as your stay approaches.</p>
          <p>Best regards,<br>${organizationName} Team</p>
        `;
        break;
      
      case 'cancellation':
        if (!reservation) throw new Error('Reservation data required for cancellation');
        subject = `Cabin Reservation Cancelled - ${reservation.family_group_name}`;
        smsMessage = `Hi ${reservation.guest_name}. Your cabin reservation (${reservation.family_group_name}) for ${new Date(reservation.check_in_date).toLocaleDateString()} has been cancelled. - ${organizationName}`;
        htmlContent = `
          <h1>Reservation Cancellation Notice</h1>
          <p>Hi ${reservation.guest_name},</p>
          <p>This email confirms that your cabin reservation has been cancelled.</p>
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>Cancelled Reservation:</h3>
            <p><strong>Family Group:</strong> ${reservation.family_group_name}</p>
            <p><strong>Original Check-in:</strong> ${new Date(reservation.check_in_date).toLocaleDateString()}</p>
            <p><strong>Original Check-out:</strong> ${new Date(reservation.check_out_date).toLocaleDateString()}</p>
             <p><strong>Reservation ID:</strong> ${reservation.id}</p>
             <p><strong><a href="https://lovable.dev/projects/ftaxzdnrnhktzbcsejoy/reservation/${reservation.id}" style="color: #2d5d2d; text-decoration: none; background: #f8d7da; padding: 8px 16px; border-radius: 4px; display: inline-block; margin-top: 8px;">🔗 View Cancelled Reservation</a></strong></p>
          </div>
          <p>If you have any questions, please don't hesitate to contact us.</p>
          <p>Best regards,<br>${organizationName} Team</p>
        `;
        break;
      
      case 'assistance_request':
        if (!reservation) throw new Error('Reservation data required for assistance request');
        subject = `Calendar Keeper Assistance Request - ${reservation.family_group_name}`;
        smsMessage = `New assistance request from ${reservation.family_group_name}. Please check the cabin management system. - ${organizationName}`;
        htmlContent = `
          <h1>New Assistance Request</h1>
          <p>Hi ${reservation.guest_name},</p>
          <p>You have received a new assistance request from ${reservation.family_group_name}.</p>
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>Request Details:</h3>
            <p><strong>From:</strong> ${reservation.family_group_name}</p>
            <p><strong>Request ID:</strong> ${reservation.id}</p>
          </div>
          <p>Please log into the cabin management system to view the full details and respond to the request.</p>
          <p>This is an automated notification from the cabin reservation system.</p>
          <p>Best regards,<br>${organizationName} Team</p>
        `;
        break;
    }

    // Send email notification
    const emailResponse = await resend.emails.send({
      from: `${organizationName} <onboarding@resend.dev>`,
      to: [reservation?.guest_email || selection_data?.guest_email || ''],
      subject: subject,
      html: htmlContent,
    });

    console.log(`${type} email sent successfully:`, emailResponse);

    // Send SMS notification if phone number is provided
    console.log("📱 SMS Check:");
    console.log("  - Has guest_phone:", !!reservation?.guest_phone);
    console.log("  - Guest phone:", reservation?.guest_phone || "Not provided");
    console.log("  - Has SMS message:", !!smsMessage);
    console.log("  - SMS message length:", smsMessage ? smsMessage.length : 0);
    
    let smsResponse = null;
    if (reservation?.guest_phone && smsMessage) {
      console.log("🚀 Attempting to send SMS...");
      smsResponse = await sendSMS(reservation.guest_phone, smsMessage);
      if (smsResponse && !smsResponse.error) {
        console.log(`✅ ${type} SMS sent successfully`);
      } else if (smsResponse && smsResponse.error) {
        console.error(`❌ ${type} SMS failed:`, smsResponse.error);
      } else {
        console.log(`⚠️ ${type} SMS skipped (credentials not configured)`);
      }
    } else {
      console.log("⏭️ SMS skipped - missing phone number or message");
    }

    return new Response(JSON.stringify({
      email: emailResponse,
      sms: smsResponse,
      success: true
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-notification function:", error);
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