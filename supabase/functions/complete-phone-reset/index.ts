import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CompletePhoneResetRequest {
  userId: string;
  newPassword: string;
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
    const { userId, newPassword }: CompletePhoneResetRequest = await req.json();

    if (!userId || !newPassword) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'User ID and new password are required' 
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    // Validate password strength
    if (newPassword.length < 6) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Password must be at least 6 characters long' 
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    console.log(`🔄 Updating password for user ID: ${userId}`);

    // Update the user's password
    const { data, error: updateError } = await supabase.auth.admin.updateUserById(
      userId,
      {
        password: newPassword,
        user_metadata: {
          // Clear the reset code after successful password update
          reset_code: null,
          reset_code_expires: null
        }
      }
    );

    if (updateError) {
      console.error('Error updating user password:', updateError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to update password. Please try again.' 
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    console.log(`✅ Password updated successfully for user: ${data.user.email}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Password updated successfully' 
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error('Error in complete-phone-reset function:', error);
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