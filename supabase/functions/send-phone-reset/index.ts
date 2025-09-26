import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Twilio configuration  
const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN");
const twilioPhoneNumber = Deno.env.get("TWILIO_PHONE_NUMBER");

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PhoneResetRequest {
  phone: string;
}

// Initialize Supabase client
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

async function sendSMS(to: string, message: string) {
  console.log(`🔄 Sending SMS to ${to}: ${message}`);
  
  if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
    console.log("❌ Twilio credentials not configured");
    throw new Error("SMS service not configured");
  }

  const auth = btoa(`${twilioAccountSid}:${twilioAuthToken}`);
  const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;

  const body = new URLSearchParams({
    From: twilioPhoneNumber,
    To: to,
    Body: message
  });

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
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { phone }: PhoneResetRequest = await req.json();

    if (!phone) {
      return new Response(
        JSON.stringify({ error: 'Phone number is required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    // Check if user exists with this phone number
    const { data: users, error: userError } = await supabase.auth.admin.listUsers();
    
    if (userError) {
      console.error('Error fetching users:', userError);
      return new Response(
        JSON.stringify({ error: 'Failed to process request' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    // Find user by phone number (check in user metadata)
    const targetUser = users.users.find(user => 
      user.phone === phone || 
      user.user_metadata?.phone === phone
    );

    if (!targetUser) {
      // For security, don't reveal if phone exists or not
      return new Response(
        JSON.stringify({ 
          message: 'If a user with this phone number exists, a verification code has been sent.' 
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    // Generate a 6-digit verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store the verification code in user metadata (expires in 10 minutes)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      targetUser.id,
      {
        user_metadata: {
          ...targetUser.user_metadata,
          reset_code: verificationCode,
          reset_code_expires: expiresAt.toISOString()
        }
      }
    );

    if (updateError) {
      console.error('Error storing verification code:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to generate verification code' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    // Send SMS with verification code
    const smsMessage = `Your Cabin Buddy password reset code is: ${verificationCode}. This code expires in 10 minutes. If you didn't request this, please ignore this message.`;
    
    try {
      await sendSMS(phone, smsMessage);
      
      return new Response(
        JSON.stringify({ 
          message: 'Verification code sent successfully to your phone.' 
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    } catch (smsError) {
      console.error('Failed to send SMS:', smsError);
      return new Response(
        JSON.stringify({ error: 'Failed to send verification code. Please try again.' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

  } catch (error: any) {
    console.error('Error in send-phone-reset function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
};

serve(handler);