import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SendMessageRequest {
  organizationId: string;
  subject: string;
  message: string;
  recipientGroup: 'administrator' | 'calendar_keeper' | 'group_leads' | 'all_users' | 'test';
  messageType: 'email' | 'sms' | 'both';
  urgent: boolean;
  testEmail?: string;
  testPhone?: string;
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      organizationId,
      subject,
      message,
      recipientGroup,
      messageType,
      urgent,
      testEmail,
      testPhone
    }: SendMessageRequest = await req.json();

    console.log('Sending message:', { organizationId, recipientGroup, messageType, urgent });

    let organization = null;
    
    // Skip organization lookup for test messages
    if (recipientGroup !== 'test') {
      // Get organization details
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', organizationId)
        .single();

      if (orgError || !orgData) {
        throw new Error('Organization not found');
      }
      
      organization = orgData;
    }

    let recipients: { email?: string; phone?: string; name?: string }[] = [];

    // Handle test messages
    if (recipientGroup === 'test') {
      if (testEmail) {
        recipients.push({
          email: testEmail,
          name: 'Test User'
        });
      }
      if (testPhone) {
        recipients.push({
          phone: testPhone,
          name: 'Test User'
        });
      }
    } else {
      // Determine recipients based on group
      switch (recipientGroup) {
        case 'administrator':
          if (organization.admin_email) {
            recipients.push({
              email: organization.admin_email,
              phone: organization.admin_phone,
              name: organization.admin_name || 'Administrator'
            });
          }
          break;

      case 'calendar_keeper':
        if (organization.calendar_keeper_email) {
          recipients.push({
            email: organization.calendar_keeper_email,
            phone: organization.calendar_keeper_phone,
            name: organization.calendar_keeper_name || 'Calendar Keeper'
          });
        }
        break;

      case 'group_leads':
        // Get all family group leads
        const { data: familyGroups, error: familyError } = await supabase
          .from('family_groups')
          .select('lead_email, lead_phone, lead_name, name')
          .eq('organization_id', organizationId)
          .not('lead_email', 'is', null);

        if (familyError) {
          throw new Error('Failed to fetch family groups');
        }

        recipients = familyGroups.map(group => ({
          email: group.lead_email,
          phone: group.lead_phone,
          name: group.lead_name || `Lead of ${group.name}`
        }));
        break;

      case 'all_users':
        // Get all users in the organization
        const { data: userOrgs, error: userError } = await supabase
          .from('user_organizations')
          .select(`
            profiles!inner(*)
          `)
          .eq('organization_id', organizationId);

        if (userError) {
          throw new Error('Failed to fetch organization users');
        }

        // Also include family group leads and organization contacts
        const { data: familyGroupsAll, error: familyErrorAll } = await supabase
          .from('family_groups')
          .select('lead_email, lead_phone, lead_name, name')
          .eq('organization_id', organizationId)
          .not('lead_email', 'is', null);

        if (familyErrorAll) {
          throw new Error('Failed to fetch family groups');
        }

        recipients = [
          ...userOrgs.map(userOrg => ({
            email: userOrg.profiles.first_name ? `${userOrg.profiles.first_name}@example.com` : null, // Note: profiles don't store emails
            name: `${userOrg.profiles.first_name || ''} ${userOrg.profiles.last_name || ''}`.trim()
          })),
          ...familyGroupsAll.map(group => ({
            email: group.lead_email,
            phone: group.lead_phone,
            name: group.lead_name || `Lead of ${group.name}`
          }))
        ];

        // Add organization contacts
        if (organization.admin_email) {
          recipients.push({
            email: organization.admin_email,
            phone: organization.admin_phone,
            name: organization.admin_name || 'Administrator'
          });
        }
        if (organization.calendar_keeper_email) {
          recipients.push({
            email: organization.calendar_keeper_email,
            phone: organization.calendar_keeper_phone,
            name: organization.calendar_keeper_name || 'Calendar Keeper'
          });
        }
        break;
      }
    }

    // Remove duplicates and filter out invalid recipients
    const uniqueRecipients = recipients.filter((recipient, index, arr) => {
      // Keep recipients that have either email or phone
      const hasContact = recipient.email || recipient.phone;
      if (!hasContact) return false;
      
      // Remove duplicates based on email or phone
      const isDuplicate = arr.findIndex(r => 
        (recipient.email && r.email === recipient.email) ||
        (recipient.phone && r.phone === recipient.phone)
      ) !== index;
      
      return !isDuplicate;
    });

    console.log(`Found ${uniqueRecipients.length} recipients`);

    if (uniqueRecipients.length === 0) {
      throw new Error('No valid recipients found');
    }

    // Send emails if requested
    if (messageType === 'email' || messageType === 'both') {
      const emailPromises = uniqueRecipients
        .filter(recipient => recipient.email)
        .map(async (recipient) => {
          try {
            const emailSubject = urgent ? `[URGENT] ${subject}` : subject;
            
            const { error } = await resend.emails.send({
              from: 'Cabin Buddy <noreply@resend.dev>',
              to: [recipient.email!],
              subject: emailSubject,
              html: `
                <h2>${emailSubject}</h2>
                <p>Dear ${recipient.name},</p>
                <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  ${message.replace(/\n/g, '<br>')}
                </div>
                <p>Best regards,<br>
                ${organization ? `${organization.name} Team` : 'CabinBuddy'}</p>
                ${urgent ? '<p style="color: red; font-weight: bold;">⚠️ This message was marked as urgent.</p>' : ''}
              `,
            });

            if (error) {
              console.error(`Failed to send email to ${recipient.email}:`, error);
              return false;
            }
            return true;
          } catch (error) {
            console.error(`Error sending email to ${recipient.email}:`, error);
            return false;
          }
        });

      await Promise.all(emailPromises);
    }

    // Send SMS if requested (using Twilio)
    if (messageType === 'sms' || messageType === 'both') {
      const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
      const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');
      const twilioPhoneNumber = Deno.env.get('TWILIO_PHONE_NUMBER');

      if (twilioAccountSid && twilioAuthToken && twilioPhoneNumber) {
        const smsPromises = uniqueRecipients
          .filter(recipient => recipient.phone)
          .map(async (recipient) => {
            try {
              const smsMessage = urgent ? `[URGENT] ${subject}\n\n${message}` : `${subject}\n\n${message}`;
              
              const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`, {
                method: 'POST',
                headers: {
                  'Authorization': `Basic ${btoa(`${twilioAccountSid}:${twilioAuthToken}`)}`,
                  'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                  From: twilioPhoneNumber,
                  To: recipient.phone!,
                  Body: smsMessage
                })
              });

              if (!response.ok) {
                console.error(`Failed to send SMS to ${recipient.phone}`);
                return false;
              }
              return true;
            } catch (error) {
              console.error(`Error sending SMS to ${recipient.phone}:`, error);
              return false;
            }
          });

        await Promise.all(smsPromises);
      } else {
        console.warn('Twilio credentials not configured, skipping SMS');
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Message sent successfully',
        recipientCount: uniqueRecipients.length
      }),
      {
        status: 200,
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders 
        },
      }
    );

  } catch (error: any) {
    console.error('Error in send-message function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders 
        },
      }
    );
  }
};

serve(handler);