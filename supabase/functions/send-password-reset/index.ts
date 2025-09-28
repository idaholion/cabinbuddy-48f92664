import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PasswordResetRequest {
  email: string;
  resetLink: string;
  organizationId?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, resetLink, organizationId }: PasswordResetRequest = await req.json();

    console.log('Password reset request:', { email, organizationId });

    if (!email || !resetLink) {
      return new Response(
        JSON.stringify({ error: 'Email and reset link are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use email for personalization (remove getUserByEmail which doesn't exist)
    const userName = email.split('@')[0] || 'there';

    // If organization ID provided, try to get custom template
    let emailSubject = 'Reset Your Password';
    let emailContent = `Hi ${userName},

We received a request to reset your password.

${resetLink}

If you didn't request this password reset, please ignore this email.

This link will expire in 24 hours for security reasons.

Best regards,
The Team`;

    if (organizationId) {
      try {
        // Get custom template and variables
        const { data: template } = await supabase
          .from('reminder_templates')
          .select('*')
          .eq('organization_id', organizationId)
          .eq('reminder_type', 'password_reset')
          .eq('is_active', true)
          .single();

        if (template) {
          // Get template variables
          const { data: variables } = await supabase.rpc('get_password_reset_template_variables', {
            p_organization_id: organizationId,
            p_user_name: userName,
            p_user_email: email,
            p_reset_link: resetLink
          });

          if (variables) {
            // Replace template variables in subject and content
            emailSubject = template.subject_template;
            emailContent = template.custom_message;

            // Replace all template variables
            Object.entries(variables as Record<string, string>).forEach(([key, value]) => {
              const placeholder = `{{${key}}}`;
              emailSubject = emailSubject.replace(new RegExp(placeholder, 'g'), value);
              emailContent = emailContent.replace(new RegExp(placeholder, 'g'), value);
            });
          }
        }
      } catch (error) {
        console.error('Error fetching template:', error);
        // Continue with default template
      }
    }

    // Send email via Resend
    const emailResponse = await resend.emails.send({
      from: "Cabin Buddy <noreply@cabinbuddy.org>",
      to: [email],
      subject: emailSubject,
      html: emailContent.replace(/\n/g, '<br>'),
    });

    console.log('Password reset email sent:', emailResponse);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Password reset email sent successfully',
        messageId: emailResponse.data?.id 
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error: any) {
    console.error('Error in send-password-reset function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
};

serve(handler);