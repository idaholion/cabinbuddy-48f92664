import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PhoneResetRequest {
  phone: string;
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

    // For now, just simulate the process since we don't have SMS service configured
    // In a real implementation, you would:
    // 1. Look up user by phone number
    // 2. Generate and store verification code
    // 3. Send SMS with verification code

    // Generate a 6-digit verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store the verification code temporarily (expires in 10 minutes)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    // Note: In a real implementation, you would:
    // 1. Store the verification code in a secure database table
    // 2. Send SMS using a service like Twilio
    // 3. Handle the verification process when user enters the code

    console.log(`Phone reset requested for: ${phone}`);
    console.log(`Verification code: ${verificationCode} (expires: ${expiresAt})`);

    // For now, just log the code since we don't have SMS service configured
    // In production, you would integrate with an SMS service here

    return new Response(
      JSON.stringify({ 
        message: 'Verification code sent successfully',
        // Remove this in production - only for testing
        debug: { code: verificationCode, expires: expiresAt }
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );

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