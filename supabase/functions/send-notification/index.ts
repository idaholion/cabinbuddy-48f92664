import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

// Twilio configuration
const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN");
const twilioPhoneNumber = Deno.env.get("TWILIO_PHONE_NUMBER");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  type: 'reminder' | 'confirmation' | 'cancellation' | 'assistance_request';
  reservation: {
    id: string;
    family_group_name: string;
    check_in_date: string;
    check_out_date: string;
    guest_email: string;
    guest_name: string;
    guest_phone?: string;
  };
  days_until?: number;
  pre_arrival_checklist?: {
    seven_day?: string[];
    three_day?: string[];
    one_day?: string[];
  };
}

async function sendSMS(to: string, message: string) {
  if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
    console.log("Twilio credentials not configured, skipping SMS");
    return null;
  }

  try {
    const auth = btoa(`${twilioAccountSid}:${twilioAuthToken}`);
    
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          "Authorization": `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          From: twilioPhoneNumber,
          To: to,
          Body: message,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error("Twilio SMS error:", error);
      return { error };
    }

    const result = await response.json();
    console.log("SMS sent successfully:", result.sid);
    return result;
  } catch (error) {
    console.error("Error sending SMS:", error);
    return { error: error.message };
  }
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, reservation, days_until, pre_arrival_checklist }: NotificationRequest = await req.json();

    let subject = "";
    let htmlContent = "";
    let smsMessage = "";

    switch (type) {
      case 'reminder':
        const checklistKey = days_until === 7 ? 'seven_day' : days_until === 3 ? 'three_day' : 'one_day';
        const checklist = pre_arrival_checklist?.[checklistKey] || [];
        
        subject = `Cabin Reservation Reminder - ${days_until} day${days_until !== 1 ? 's' : ''} to go!`;
        smsMessage = `Hi ${reservation.guest_name}! Your cabin reservation (${reservation.family_group_name}) is in ${days_until} day${days_until !== 1 ? 's' : ''}. Check-in: ${new Date(reservation.check_in_date).toLocaleDateString()}. Check your email for pre-arrival checklist. - CabinBuddy`;
        
        const checklistHtml = checklist.length > 0 ? `
          <div style="background: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #2d5d2d; margin-top: 0;">📋 Pre-Arrival Checklist (${days_until} day${days_until !== 1 ? 's' : ''} out)</h3>
            <ul style="margin: 10px 0; padding-left: 20px;">
              ${checklist.map(item => `<li style="margin-bottom: 8px;">${item}</li>`).join('')}
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
            </div>
            
            ${checklistHtml}
            
            ${days_until <= 3 ? `
              <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
                <h4 style="margin-top: 0; color: #856404;">🚨 Important Reminders:</h4>
                <ul style="margin: 10px 0; padding-left: 20px;">
                  <li>Confirm your arrival time with the calendar keeper if needed</li>
                  <li>Make sure all guests have the cabin address and WiFi information</li>
                  <li>Save emergency contact numbers in your phone</li>
                </ul>
              </div>
            ` : ''}
            
            <div style="background: #e3f2fd; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <h4 style="margin-top: 0; color: #1565c0;">📱 Quick Access:</h4>
              <p style="margin-bottom: 5px;">• Log into the cabin management system to:</p>
              <ul style="margin: 5px 0; padding-left: 20px;">
                <li>Check and coordinate on the shopping list</li>
                <li>Access cabin rules and documents</li>
                <li>View guest information packet</li>
                <li>Get current weather and conditions</li>
              </ul>
            </div>
            
            <p>We're looking forward to your stay and hope you have a wonderful time!</p>
            <p style="margin-top: 30px;">Best regards,<br><strong>CabinBuddy Team</strong></p>
          </div>
        `;
        break;
      
      case 'confirmation':
        subject = `Cabin Reservation Confirmed - ${reservation.family_group_name}`;
        smsMessage = `Hi ${reservation.guest_name}! Your cabin reservation (${reservation.family_group_name}) is confirmed. Check-in: ${new Date(reservation.check_in_date).toLocaleDateString()}. - CabinBuddy`;
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
          </div>
          <p>You'll receive reminder notifications as your stay approaches.</p>
          <p>Best regards,<br>CabinBuddy Team</p>
        `;
        break;
      
      case 'cancellation':
        subject = `Cabin Reservation Cancelled - ${reservation.family_group_name}`;
        smsMessage = `Hi ${reservation.guest_name}. Your cabin reservation (${reservation.family_group_name}) for ${new Date(reservation.check_in_date).toLocaleDateString()} has been cancelled. - CabinBuddy`;
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
          </div>
          <p>If you have any questions, please don't hesitate to contact us.</p>
          <p>Best regards,<br>CabinBuddy Team</p>
        `;
        break;
      
      case 'assistance_request':
        subject = `Calendar Keeper Assistance Request - ${reservation.family_group_name}`;
        smsMessage = `New assistance request from ${reservation.family_group_name}. Please check the cabin management system. - CabinBuddy`;
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
          <p>Best regards,<br>CabinBuddy Team</p>
        `;
        break;
    }

    // Send email notification
    const emailResponse = await resend.emails.send({
      from: "CabinBuddy <noreply@yourdomainhere.com>",
      to: [reservation.guest_email],
      subject: subject,
      html: htmlContent,
    });

    console.log(`${type} email sent successfully:`, emailResponse);

    // Send SMS notification if phone number is provided
    let smsResponse = null;
    if (reservation.guest_phone && smsMessage) {
      smsResponse = await sendSMS(reservation.guest_phone, smsMessage);
      if (smsResponse && !smsResponse.error) {
        console.log(`${type} SMS sent successfully`);
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