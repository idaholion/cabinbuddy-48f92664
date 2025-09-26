import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VerifyPhoneResetRequest {
  phone: string;
  code: string;
}

// Initialize Supabase client
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { phone, code }: VerifyPhoneResetRequest = await req.json();

    if (!phone || !code) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Phone number and verification code are required' 
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    // Validate code format (6 digits)
    if (!/^\d{6}$/.test(code)) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid verification code format' 
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    console.log(`🔍 Verifying code for phone: ${phone}`);

    // Get all users to find the one with this phone number
    const { data: users, error: userError } = await supabase.auth.admin.listUsers();
    
    if (userError) {
      console.error('Error fetching users:', userError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to process verification' 
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    // Find user by phone number
    const targetUser = users.users.find(user => 
      user.phone === phone || 
      user.user_metadata?.phone === phone
    );

    if (!targetUser) {
      console.log(`❌ No user found with phone: ${phone}`);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid verification code or phone number' 
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    // Check if verification code matches and is not expired
    const storedCode = targetUser.user_metadata?.reset_code;
    const expiresAt = targetUser.user_metadata?.reset_code_expires;

    if (!storedCode || !expiresAt) {
      console.log(`❌ No verification code found for user: ${targetUser.email}`);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'No verification code found. Please request a new one.' 
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    // Check if code has expired
    const now = new Date();
    const expiration = new Date(expiresAt);
    
    if (now > expiration) {
      console.log(`❌ Verification code expired for user: ${targetUser.email}`);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Verification code has expired. Please request a new one.' 
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    // Check if code matches
    if (storedCode !== code) {
      console.log(`❌ Invalid verification code for user: ${targetUser.email}`);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid verification code' 
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    console.log(`✅ Verification code validated for user: ${targetUser.email}`);

    // Code is valid - return success with user ID for password reset
    return new Response(
      JSON.stringify({ 
        success: true, 
        userId: targetUser.id,
        message: 'Verification code validated successfully' 
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error('Error in verify-phone-reset function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Internal server error' 
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
};

serve(handler);