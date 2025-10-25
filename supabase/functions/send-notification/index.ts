import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { Resend } from "https://esm.sh/resend@2.0.0";

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
  type: 'reminder' | 'confirmation' | 'cancellation' | 'assistance_request' | 'selection_period' | 'selection_period_start' | 'selection_period_end' | 'selection_turn_ready' | 'work_weekend_proposed' | 'work_weekend_invitation' | 'work_weekend_approved' | 'work_weekend_reminder' | 'manual_template';
  reservation?: {
    id: string;
    family_group_name: string;
    check_in_date: string;
    check_out_date: string;
    guest_email: string;
    guest_name: string;
    guest_phone?: string;
    days_until?: number;
    period?: {
      period_name: string;
      start_date: string;
      end_date: string;
    };
    work_weekend?: {
      title: string;
      start_date: string;
      end_date: string;
      proposer_family_group: string;
    };
    family_groups?: {
      lead_email: string;
      lead_name: string;
      lead_phone: string;
    };
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
    guest_phone?: string;
    selection_year: string;
    selection_start_date: string;
    selection_end_date: string;
    available_periods: string;
    selection_window?: string;  // e.g., "2 weeks" or "1 week"
    max_periods?: string;  // e.g., "up to 2 periods" or "1 additional period"
    is_secondary_phase?: boolean;
  };
  // For work weekend notifications
  work_weekend_data?: {
    id: string;
    title: string;
    description?: string;
    start_date: string;
    end_date: string;
    proposer_name: string;
    proposer_family_group?: string;
    invitation_message?: string;
    recipient_name: string;
    recipient_email: string;
    recipient_phone?: string;
    recipient_family_group?: string;
  };
  // For manual template notifications
  template?: {
    id: string;
    subject_template: string;
    custom_message: string;
    checklist_items: string[];
  };
  recipients?: Array<{
    name: string;
    email: string;
    familyGroup: string;
  }>;
  template_variables?: Record<string, string>;
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
    console.error("  - Error name:", error instanceof Error ? error.name : 'Unknown');
    console.error("  - Error message:", error instanceof Error ? error.message : 'Unknown error');
    console.error("  - Error stack:", error instanceof Error ? error.stack : 'No stack trace');
    return { error: error instanceof Error ? error.message : 'Unknown error' };
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
      .select('*, sms_message_template')
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
    const { type, reservation, organization_id, days_until, selection_data, work_weekend_data, template, recipients, template_variables }: NotificationRequest = await req.json();

    let subject = "";
    let htmlContent = "";
    let smsMessage = "";
    
    const organizationName = await getOrganizationName(organization_id);

    switch (type) {
      case 'reminder':
        if (!reservation) throw new Error('Reservation data required for reminder');
        
        // Determine reminder type based on days_until
        let reminderType = 'one_day';
        if (days_until === 7) reminderType = 'seven_day';
        else if (days_until === 3) reminderType = 'three_day';
        
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
                ${checklistItems.map((item: any) => `<li style="margin-bottom: 8px;">${item}</li>`).join('')}
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
          
          // Use custom SMS template if available, otherwise use default
          if (template.sms_message_template) {
            smsMessage = replaceVariables(template.sms_message_template, variables);
          } else {
            smsMessage = `Hi ${reservation.guest_name}! Your cabin reservation (${reservation.family_group_name}) is in ${days_until} day${days_until !== 1 ? 's' : ''}. Check-in: ${new Date(reservation.check_in_date).toLocaleDateString()}. Check your email for details. - ${organizationName}`;
          }
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
          
          smsMessage = `Hi ${reservation.guest_name}! Your cabin reservation (${reservation.family_group_name}) is in ${days_until} day${days_until !== 1 ? 's' : ''}. Check-in: ${new Date(reservation.check_in_date).toLocaleDateString()}. Check your email for details. - ${organizationName}`;
        }
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
                ${checklistItems.map((item: any) => `<li style="margin-bottom: 8px;">${item}</li>`).join('')}
              </ul>
            </div>
          ` : '';
          
          htmlContent = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; line-height: 1.6;">
              ${customMessage.split('\n').map(line => `<p>${line}</p>`).join('')}
              ${checklistHtml}
            </div>
          `;
          
          // Use custom SMS template if available, otherwise use default
          if (selectionTemplate.sms_message_template) {
            smsMessage = replaceVariables(selectionTemplate.sms_message_template, selectionVariables);
          } else {
            smsMessage = `Hi ${selection_data.guest_name}! Calendar selection for ${selection_data.selection_year} is now open. Please make your selections by ${selection_data.selection_end_date}. - ${organizationName}`;
          }
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
          
          smsMessage = `Hi ${selection_data.guest_name}! Calendar selection for ${selection_data.selection_year} is now open. Please make your selections by ${selection_data.selection_end_date}. - ${organizationName}`;
        }
        break;

      case 'selection_period_start':
        if (!selection_data) throw new Error('Selection data required for selection period start notification');
        
        const startTemplate = await getTemplate(organization_id, 'selection_period_start');
        
        const startVariables = {
          guest_name: selection_data.guest_name,
          family_group_name: selection_data.family_group_name,
          selection_year: selection_data.selection_year,
          selection_start_date: selection_data.selection_start_date,
          selection_end_date: selection_data.selection_end_date,
          available_periods: selection_data.available_periods,
          organization_name: organizationName,
        };

        if (startTemplate) {
          subject = replaceVariables(startTemplate.subject_template, startVariables);
          
          const customMessage = replaceVariables(startTemplate.custom_message, startVariables);
          const checklistItems = startTemplate.checklist_items || [];
          
          const checklistHtml = checklistItems.length > 0 ? `
            <div style="background: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #1565c0; margin-top: 0;">📋 Selection Checklist</h3>
              <ul style="margin: 10px 0; padding-left: 20px;">
                ${checklistItems.map((item: any) => `<li style="margin-bottom: 8px;">${item}</li>`).join('')}
              </ul>
            </div>
          ` : '';
          
          htmlContent = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; line-height: 1.6;">
              ${customMessage.split('\n').map(line => `<p>${line}</p>`).join('')}
              ${checklistHtml}
            </div>
          `;
          
          // Use custom SMS template if available, otherwise use default
          if (startTemplate.sms_message_template) {
            smsMessage = replaceVariables(startTemplate.sms_message_template, startVariables);
          } else {
            const selectionWindow = selection_data.selection_window || '2 weeks';
            const maxPeriods = selection_data.max_periods || 'up to 2 periods';
            const phaseText = selection_data.is_secondary_phase ? 'secondary calendar selection' : 'calendar selection';
            smsMessage = `Hi ${selection_data.guest_name}! Your ${phaseText} for ${selection_data.selection_year} starts now. You have ${selectionWindow} to select ${maxPeriods}. - ${organizationName}`;
          }
        } else {
          // Default selection period start template
          const selectionWindow = selection_data.selection_window || '2 weeks';
          const maxPeriods = selection_data.max_periods || 'up to 2 periods';
          const phaseText = selection_data.is_secondary_phase ? 'Secondary Calendar Selection' : 'Calendar Selection';
          
          subject = `${phaseText} Period Starts Now - ${selection_data.selection_year}`;
          htmlContent = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; line-height: 1.6;">
              <h1 style="color: #2d5d2d; text-align: center;">📅 Your Selection Period Starts Now!</h1>
              <p>Hi ${selection_data.guest_name},</p>
              <p>Your ${phaseText.toLowerCase()} period for <strong>${selection_data.selection_year}</strong> is now active!</p>
              
              <div style="background: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin-top: 0;">📋 Selection Details:</h3>
                <p><strong>Family Group:</strong> ${selection_data.family_group_name}</p>
                <p><strong>Selection Window:</strong> ${selectionWindow}</p>
                <p><strong>You Can Select:</strong> ${maxPeriods}</p>
                <p><strong>Available Periods:</strong> ${selection_data.available_periods}</p>
              </div>
              
              <div style="background: #fff3e0; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #f57c00; margin-top: 0;">⏰ Action Needed</h3>
                <p>Please log into the cabin management system to make your selections. You have ${selectionWindow} to complete your selections.</p>
              </div>
              
              <p>Happy selecting!</p>
              <p style="margin-top: 30px;">Best regards,<br><strong>${organizationName} Calendar Keeper</strong></p>
            </div>
          `;
        }
        
        const selectionWindow = selection_data.selection_window || '2 weeks';
        const maxPeriods = selection_data.max_periods || 'up to 2 periods';
        const phaseText = selection_data.is_secondary_phase ? 'secondary calendar selection' : 'calendar selection';
        smsMessage = `Hi ${selection_data.guest_name}! Your ${phaseText} for ${selection_data.selection_year} starts now. You have ${selectionWindow} to select ${maxPeriods}. - ${organizationName}`;
        break;

      case 'selection_period_end':
        if (!selection_data) throw new Error('Selection data required for selection period end notification');
        
        const endTemplate = await getTemplate(organization_id, 'selection_period_end');
        
        const endVariables = {
          guest_name: selection_data.guest_name,
          family_group_name: selection_data.family_group_name,
          selection_year: selection_data.selection_year,
          selection_start_date: selection_data.selection_start_date,
          selection_end_date: selection_data.selection_end_date,
          available_periods: selection_data.available_periods,
          organization_name: organizationName,
        };

        if (endTemplate) {
          subject = replaceVariables(endTemplate.subject_template, endVariables);
          
          const customMessage = replaceVariables(endTemplate.custom_message, endVariables);
          const checklistItems = endTemplate.checklist_items || [];
          
          const checklistHtml = checklistItems.length > 0 ? `
            <div style="background: #fff3e0; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #f57c00; margin-top: 0;">⏰ Final Reminders</h3>
              <ul style="margin: 10px 0; padding-left: 20px;">
                ${checklistItems.map((item: any) => `<li style="margin-bottom: 8px;">${item}</li>`).join('')}
              </ul>
            </div>
          ` : '';
          
          htmlContent = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; line-height: 1.6;">
              ${customMessage.split('\n').map(line => `<p>${line}</p>`).join('')}
              ${checklistHtml}
            </div>
          `;
          
          // Use custom SMS template if available, otherwise use default
          if (endTemplate.sms_message_template) {
            smsMessage = replaceVariables(endTemplate.sms_message_template, endVariables);
          } else {
            smsMessage = `FINAL CALL: ${selection_data.guest_name}, your calendar selection for ${selection_data.selection_year} ends TODAY (${selection_data.selection_end_date})! Make your selections now! - ${organizationName}`;
          }
        } else {
          // Default selection period end template
          subject = `LAST DAY: Calendar Selection Period Ends Today - ${selection_data.selection_year}`;
          htmlContent = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; line-height: 1.6;">
              <h1 style="color: #d32f2f; text-align: center;">⏰ Final Call for Calendar Selection!</h1>
              <p>Hi ${selection_data.guest_name},</p>
              <p><strong>This is your final reminder</strong> that your calendar selection period for <strong>${selection_data.selection_year}</strong> ends TODAY!</p>
              
              <div style="background: #ffebee; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #d32f2f;">
                <h3 style="margin-top: 0; color: #d32f2f;">🚨 Urgent - Action Required:</h3>
                <p><strong>Family Group:</strong> ${selection_data.family_group_name}</p>
                <p><strong>Selection Ends:</strong> ${selection_data.selection_end_date}</p>
                <p><strong>Available Periods:</strong> ${selection_data.available_periods}</p>
              </div>
              
              <p><strong>Please log into the cabin management system immediately to make your selections before the deadline!</strong></p>
              <p style="margin-top: 30px;">Best regards,<br><strong>${organizationName} Calendar Keeper</strong></p>
            </div>
          `;
        }
        
        smsMessage = `FINAL CALL: ${selection_data.guest_name}, your calendar selection for ${selection_data.selection_year} ends TODAY (${selection_data.selection_end_date})! Make your selections now! - ${organizationName}`;
        break;

      case 'selection_turn_ready':
        if (!selection_data) throw new Error('Selection data required for selection turn ready notification');
        
        const turnReadyTemplate = await getTemplate(organization_id, 'selection_period_start');
        
        const turnReadyVariables = {
          guest_name: selection_data.guest_name,
          family_group_name: selection_data.family_group_name,
          selection_year: selection_data.selection_year,
          available_periods: selection_data.available_periods,
          organization_name: organizationName,
        };

        if (turnReadyTemplate) {
          subject = replaceVariables(turnReadyTemplate.subject_template, turnReadyVariables);
          
          const customMessage = replaceVariables(turnReadyTemplate.custom_message, turnReadyVariables);
          const checklistItems = turnReadyTemplate.checklist_items || [];
          
          const checklistHtml = checklistItems.length > 0 ? `
            <div style="background: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #2d5d2d; margin-top: 0;">📋 Selection Checklist</h3>
              <ul style="margin: 10px 0; padding-left: 20px;">
                ${checklistItems.map((item: any) => `<li style="margin-bottom: 8px;">${item}</li>`).join('')}
              </ul>
            </div>
          ` : '';
          
          htmlContent = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; line-height: 1.6;">
              ${customMessage.split('\n').map(line => `<p>${line}</p>`).join('')}
              ${checklistHtml}
            </div>
          `;
          
          // Use custom SMS template if available, otherwise use default
          if (turnReadyTemplate.sms_message_template) {
            smsMessage = replaceVariables(turnReadyTemplate.sms_message_template, turnReadyVariables);
          } else {
            smsMessage = `Hi ${selection_data.guest_name}! It's now your turn to select cabin dates for ${selection_data.selection_year}. Log in to make your selections! - ${organizationName}`;
          }
        } else {
          // Default selection turn ready template
          subject = `It's Your Turn to Select! - ${selection_data.selection_year}`;
          htmlContent = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; line-height: 1.6;">
              <h1 style="color: #2d5d2d; text-align: center;">🎉 It's Your Turn to Select!</h1>
              <p>Hi ${selection_data.guest_name},</p>
              <p>Great news! The previous family has completed their selection, and it's now your turn to select your cabin dates for <strong>${selection_data.selection_year}</strong>.</p>
              
              <div style="background: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin-top: 0;">📋 Your Selection Details:</h3>
                <p><strong>Family Group:</strong> ${selection_data.family_group_name}</p>
                <p><strong>Available Periods:</strong> ${selection_data.available_periods}</p>
                <p><strong>Selection Status:</strong> Ready to start!</p>
              </div>
              
              <div style="background: #fff3e0; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #f57c00; margin-top: 0;">⏰ Action Needed</h3>
                <p>Please log into the cabin management system as soon as possible to make your selections. Remember to click "I'm Done" when you've finished selecting all your dates.</p>
              </div>
              
              <p>Happy selecting!</p>
              <p style="margin-top: 30px;">Best regards,<br><strong>${organizationName} Calendar Keeper</strong></p>
            </div>
          `;
        }
          
          smsMessage = `Hi ${selection_data.guest_name}! It's now your turn to select cabin dates for ${selection_data.selection_year}. Log in to make your selections! - ${organizationName}`;
        }
        break;

      case 'work_weekend_proposed':
        if (!work_weekend_data) throw new Error('Work weekend data required for work weekend proposal');
        
        subject = `Work Weekend Proposed: ${work_weekend_data.title}`;
        
        htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; line-height: 1.6;">
            <h1 style="color: #2d5d2d; text-align: center;">🔨 Work Weekend Proposed</h1>
            <p>Hi ${work_weekend_data.recipient_name},</p>
            <p>A work weekend has been proposed for the cabin and your approval may be needed.</p>
            
            <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0;">📋 Work Weekend Details:</h3>
              <p><strong>Title:</strong> ${work_weekend_data.title}</p>
              <p><strong>Proposed by:</strong> ${work_weekend_data.proposer_name} (${work_weekend_data.proposer_family_group || 'Unknown Group'})</p>
              <p><strong>Dates:</strong> ${new Date(work_weekend_data.start_date).toLocaleDateString()} - ${new Date(work_weekend_data.end_date).toLocaleDateString()}</p>
              ${work_weekend_data.description ? `<p><strong>Description:</strong> ${work_weekend_data.description}</p>` : ''}
              ${work_weekend_data.invitation_message ? `<p><strong>Message:</strong> ${work_weekend_data.invitation_message}</p>` : ''}
            </div>
            
            <p>Please review this proposal and provide your approval if needed.</p>
            <p style="margin-top: 30px;">Best regards,<br><strong>${organizationName} Team</strong></p>
          </div>
        `;
        
        smsMessage = `Work weekend proposed: "${work_weekend_data.title}" ${new Date(work_weekend_data.start_date).toLocaleDateString()}-${new Date(work_weekend_data.end_date).toLocaleDateString()} by ${work_weekend_data.proposer_name}. - ${organizationName}`;
        break;

      case 'work_weekend_invitation':
        if (!work_weekend_data) throw new Error('Work weekend data required for work weekend invitation');
        
        subject = `Join Us: ${work_weekend_data.title}`;
        
        htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; line-height: 1.6;">
            <h1 style="color: #2d5d2d; text-align: center;">🏡 You're Invited to Help!</h1>
            <p>Hi ${work_weekend_data.recipient_name},</p>
            <p>You're invited to participate in an upcoming work weekend at the cabin.</p>
            
            <div style="background: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #2d5d2d;">🔨 Work Weekend Details:</h3>
              <p><strong>Title:</strong> ${work_weekend_data.title}</p>
              <p><strong>Organized by:</strong> ${work_weekend_data.proposer_name} (${work_weekend_data.proposer_family_group || 'Unknown Group'})</p>
              <p><strong>Dates:</strong> ${new Date(work_weekend_data.start_date).toLocaleDateString()} - ${new Date(work_weekend_data.end_date).toLocaleDateString()}</p>
              ${work_weekend_data.description ? `<p><strong>What we'll be doing:</strong> ${work_weekend_data.description}</p>` : ''}
            </div>
            
            ${work_weekend_data.invitation_message ? `
              <div style="background: #f0f8ff; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2d5d2d;">
                <p style="margin: 0; font-style: italic;">"${work_weekend_data.invitation_message}"</p>
              </div>
            ` : ''}
            
            <p>Your help would be greatly appreciated! Please let us know if you can participate.</p>
            <p style="margin-top: 30px;">Looking forward to working together,<br><strong>${organizationName} Team</strong></p>
          </div>
        `;
        
        smsMessage = `You're invited to work weekend: "${work_weekend_data.title}" ${new Date(work_weekend_data.start_date).toLocaleDateString()}-${new Date(work_weekend_data.end_date).toLocaleDateString()}. Can you help? - ${organizationName}`;
        break;

      case 'work_weekend_approved':
        if (!work_weekend_data) throw new Error('Work weekend data required for work weekend approval');
        
        subject = `Work Weekend Approved: ${work_weekend_data.title}`;
        
        htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; line-height: 1.6;">
            <h1 style="color: #2d5d2d; text-align: center;">✅ Work Weekend Approved</h1>
            <p>Hi ${work_weekend_data.recipient_name},</p>
            <p>Great news! The following work weekend has been approved and is now scheduled.</p>
            
            <div style="background: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #2d5d2d;">📅 Scheduled Work Weekend:</h3>
              <p><strong>Title:</strong> ${work_weekend_data.title}</p>
              <p><strong>Organized by:</strong> ${work_weekend_data.proposer_name} (${work_weekend_data.proposer_family_group || 'Unknown Group'})</p>
              <p><strong>Dates:</strong> ${new Date(work_weekend_data.start_date).toLocaleDateString()} - ${new Date(work_weekend_data.end_date).toLocaleDateString()}</p>
              ${work_weekend_data.description ? `<p><strong>Planned work:</strong> ${work_weekend_data.description}</p>` : ''}
            </div>
            
            <p>Mark your calendars and consider joining us if you're available. Every helping hand makes a difference!</p>
            <p style="margin-top: 30px;">Best regards,<br><strong>${organizationName} Team</strong></p>
          </div>
        `;
        
        smsMessage = `Work weekend approved: "${work_weekend_data.title}" ${new Date(work_weekend_data.start_date).toLocaleDateString()}-${new Date(work_weekend_data.end_date).toLocaleDateString()}. Join us if available! - ${organizationName}`;
        break;

      case 'selection_period_start':
        if (!reservation) throw new Error('Reservation data required for selection period start');
        subject = `Selection Period Starting Soon - ${reservation.period?.period_name}`;
        
        htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; line-height: 1.6;">
            <h1 style="color: #2d5d2d; text-align: center;">📅 Selection Period Starting Soon</h1>
            <p>Dear ${reservation.guest_name || 'Guest'},</p>
            <p>The selection period "<strong>${reservation.period?.period_name}</strong>" will start in 3 days on ${reservation.period?.start_date}.</p>
            <p>Make sure you're ready to make your selections when the period opens.</p>
            
            <div style="background: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #1565c0; margin-top: 0;">📋 Selection Period Details:</h3>
              <p><strong>Period Name:</strong> ${reservation.period?.period_name}</p>
              <p><strong>Start Date:</strong> ${reservation.period?.start_date}</p>
              <p><strong>End Date:</strong> ${reservation.period?.end_date}</p>
            </div>
            
            <p>Please log into the cabin management system to make your selections as soon as the period opens.</p>
            <p style="margin-top: 30px;">Best regards,<br><strong>${organizationName} Calendar Keeper</strong></p>
          </div>
        `;
        
        smsMessage = `Selection period "${reservation.period?.period_name}" starts in 3 days on ${reservation.period?.start_date}. Be ready! - ${organizationName}`;
        break;

      case 'selection_period_end':
        if (!reservation) throw new Error('Reservation data required for selection period end');
        subject = `Selection Period Ending Today - ${reservation.period?.period_name}`;
        
        htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; line-height: 1.6;">
            <h1 style="color: #d32f2f; text-align: center;">⏰ Selection Period Ending Today</h1>
            <p>Dear ${reservation.guest_name || 'Guest'},</p>
            <p>The selection period "<strong>${reservation.period?.period_name}</strong>" ends today!</p>
            <p>This is your last chance to make any selections for this period.</p>
            
            <div style="background: #ffebee; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #d32f2f;">
              <h3 style="color: #d32f2f; margin-top: 0;">⚠️ Urgent: Selection Period Details:</h3>
              <p><strong>Period Name:</strong> ${reservation.period?.period_name}</p>
              <p><strong>Start Date:</strong> ${reservation.period?.start_date}</p>
              <p><strong>End Date:</strong> ${reservation.period?.end_date}</p>
            </div>
            
            <p><strong>Don't miss out!</strong> Log into the cabin management system now to complete your selections before the period closes.</p>
            <p style="margin-top: 30px;">Best regards,<br><strong>${organizationName} Calendar Keeper</strong></p>
          </div>
        `;
        
        smsMessage = `Last chance! Selection period "${reservation.period?.period_name}" ends today. Make your selections now! - ${organizationName}`;
        break;

      case 'work_weekend_reminder':
        if (!reservation) throw new Error('Reservation data required for work weekend reminder');
        const daysText = reservation.days_until === 1 ? 'tomorrow' : `in ${reservation.days_until} days`;
        subject = `Work Weekend Reminder - ${reservation.work_weekend?.title} starts ${daysText}`;
        
        htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; line-height: 1.6;">
            <h1 style="color: #2d5d2d; text-align: center;">🔨 Work Weekend Reminder</h1>
            <p>Dear ${reservation.guest_name || 'Guest'},</p>
            <p>This is a reminder that the work weekend "<strong>${reservation.work_weekend?.title}</strong>" starts ${daysText}.</p>
            
            <div style="background: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #2d5d2d; margin-top: 0;">🔨 Work Weekend Details:</h3>
              <p><strong>Title:</strong> ${reservation.work_weekend?.title}</p>
              <p><strong>Start Date:</strong> ${reservation.work_weekend?.start_date}</p>
              <p><strong>End Date:</strong> ${reservation.work_weekend?.end_date}</p>
              <p><strong>Proposed by:</strong> ${reservation.work_weekend?.proposer_family_group}</p>
            </div>
            
            <p>Please make sure you're prepared and available for the activities planned. Your participation helps maintain and improve our shared cabin facilities.</p>
            <p style="margin-top: 30px;">Looking forward to working together,<br><strong>${organizationName} Team</strong></p>
          </div>
        `;
        
        smsMessage = `Work weekend "${reservation.work_weekend?.title}" starts ${daysText}. Proposed by ${reservation.work_weekend?.proposer_family_group}. Be ready! - ${organizationName}`;
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

      case 'manual_template':
        if (!template || !recipients) throw new Error('Template and recipients required for manual template notification');
        
        // For manual templates, we'll send to each recipient individually
        const emailPromises = recipients.map(async (recipient) => {
          // Replace recipient-specific variables
          let personalizedSubject = template.subject_template;
          let personalizedContent = template.custom_message;
          
          // Apply recipient-specific variables
          const recipientVariables = {
            recipient_name: recipient.name,
            family_group_name: recipient.familyGroup,
            ...template_variables
          };
          
          Object.entries(recipientVariables).forEach(([key, value]) => {
            const regex = new RegExp(`{{${key}}}`, 'g');
            personalizedSubject = personalizedSubject.replace(regex, value || '');
            personalizedContent = personalizedContent.replace(regex, value || '');
          });
          
          // Add checklist items if they exist
          const checklistHtml = template.checklist_items && template.checklist_items.length > 0 ? `
            <div style="background: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #2d5d2d; margin-top: 0;">📋 Important Items</h3>
              <ul style="margin: 10px 0; padding-left: 20px;">
                ${template.checklist_items.map((item: string) => `<li style="margin-bottom: 8px;">${item}</li>`).join('')}
              </ul>
            </div>
          ` : '';
          
          const htmlContent = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; line-height: 1.6;">
              ${personalizedContent.split('\n').map((line: string) => `<p>${line}</p>`).join('')}
              ${checklistHtml}
              <p style="margin-top: 30px;">Best regards,<br><strong>${organizationName} Team</strong></p>
            </div>
          `;
          
          return resend.emails.send({
            from: "CabinBuddy <noreply@cabinbuddy.org>",
            to: [recipient.email],
            subject: personalizedSubject,
            html: htmlContent,
          });
        });
        
        // Wait for all emails to send
        const emailResults = await Promise.allSettled(emailPromises);
        const successfulSends = emailResults.filter(result => result.status === 'fulfilled').length;
        const failedSends = emailResults.filter(result => result.status === 'rejected').length;
        
        console.log(`Manual template sent: ${successfulSends} successful, ${failedSends} failed`);
        
        // For manual templates, we'll use the first recipient's info for the response format
        subject = template.subject_template;
        htmlContent = template.custom_message;
        smsMessage = `Notification sent from ${organizationName}`;
        break;
    }

    // Send email using Resend
    let emailResponse;
    if (type === 'manual_template') {
      // Manual templates handle their own email sending
      emailResponse = { message: 'Manual template emails sent individually' };
    } else {
      emailResponse = await resend.emails.send({
        from: "CabinBuddy <noreply@cabinbuddy.org>",
        to: [reservation?.guest_email, selection_data?.guest_email, work_weekend_data?.recipient_email].filter(Boolean) as string[],
        subject: subject,
        html: htmlContent,
      });
      
      console.log("📧 Email sent:", emailResponse);
    }

    // Send SMS if phone number is provided and SMS message is not empty
    let smsResponse = null;
    if (type !== 'manual_template') {
      const phoneNumber = reservation?.guest_phone || selection_data?.guest_phone || work_weekend_data?.recipient_phone;
      if (phoneNumber && smsMessage) {
        console.log("📱 Attempting to send SMS...");
        smsResponse = await sendSMS(phoneNumber, smsMessage);
        
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