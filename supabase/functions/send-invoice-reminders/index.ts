import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    console.log("Starting automated invoice reminder check...");

    // Get all organizations with reminder automation enabled
    const { data: organizations } = await supabaseClient
      .from("reservation_settings")
      .select("organization_id, reminder_7_days_enabled, reminder_3_days_enabled, reminder_1_day_enabled, reminder_due_date_enabled, overdue_reminder_interval_days, reminder_email_subject, reminder_email_body")
      .or("reminder_7_days_enabled.eq.true,reminder_3_days_enabled.eq.true,reminder_1_day_enabled.eq.true,reminder_due_date_enabled.eq.true");

    if (!organizations || organizations.length === 0) {
      return new Response(
        JSON.stringify({ message: "No organizations with reminders enabled" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let totalSent = 0;
    let totalErrors = 0;

    for (const orgSettings of organizations) {
      console.log(`Processing organization: ${orgSettings.organization_id}`);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Get organization details
      const { data: org } = await supabaseClient
        .from("organizations")
        .select("name")
        .eq("id", orgSettings.organization_id)
        .single();

      // Find invoices needing reminders
      const { data: invoices } = await supabaseClient
        .from("invoices")
        .select("*")
        .eq("organization_id", orgSettings.organization_id)
        .in("status", ["sent", "partial", "overdue"])
        .gt("balance_due", 0);

      if (!invoices || invoices.length === 0) continue;

      for (const invoice of invoices) {
        const dueDate = new Date(invoice.due_date);
        dueDate.setHours(0, 0, 0, 0);
        const daysUntilDue = Math.floor((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        let shouldSendReminder = false;
        let reminderType: "7_days" | "3_days" | "1_day" | "due_date" | "overdue" | null = null;

        // Check which reminder type to send
        if (daysUntilDue === 7 && orgSettings.reminder_7_days_enabled) {
          shouldSendReminder = true;
          reminderType = "7_days";
        } else if (daysUntilDue === 3 && orgSettings.reminder_3_days_enabled) {
          shouldSendReminder = true;
          reminderType = "3_days";
        } else if (daysUntilDue === 1 && orgSettings.reminder_1_day_enabled) {
          shouldSendReminder = true;
          reminderType = "1_day";
        } else if (daysUntilDue === 0 && orgSettings.reminder_due_date_enabled) {
          shouldSendReminder = true;
          reminderType = "due_date";
        } else if (daysUntilDue < 0 && orgSettings.overdue_reminder_interval_days) {
          // Check if we should send overdue reminder
          const daysPastDue = Math.abs(daysUntilDue);
          if (daysPastDue % orgSettings.overdue_reminder_interval_days === 0) {
            shouldSendReminder = true;
            reminderType = "overdue";
          }
        }

        if (!shouldSendReminder || !reminderType) continue;

        // Check if we already sent this reminder type today
        const { data: existingLog } = await supabaseClient
          .from("invoice_reminders_log")
          .select("id")
          .eq("invoice_id", invoice.id)
          .eq("reminder_type", reminderType)
          .gte("sent_at", today.toISOString())
          .maybeSingle();

        if (existingLog) {
          console.log(`Reminder already sent for invoice ${invoice.invoice_number}`);
          continue;
        }

        // Get family group email
        const { data: familyGroup } = await supabaseClient
          .from("family_groups")
          .select("lead_email, lead_name")
          .eq("organization_id", orgSettings.organization_id)
          .eq("name", invoice.family_group)
          .single();

        if (!familyGroup?.lead_email) {
          console.error(`No email found for family group: ${invoice.family_group}`);
          totalErrors++;
          continue;
        }

        // Build reminder email
        const emailSubject = orgSettings.reminder_email_subject ||
          `Payment Reminder: Invoice ${invoice.invoice_number}`;

        const urgencyText = reminderType === "overdue" 
          ? `<strong style="color: #dc2626;">OVERDUE</strong> - Payment was due on ${dueDate.toLocaleDateString()}`
          : reminderType === "due_date"
          ? `<strong style="color: #ea580c;">DUE TODAY</strong>`
          : `Due in ${daysUntilDue} day${daysUntilDue !== 1 ? 's' : ''}`;

        const emailBody = orgSettings.reminder_email_body
          ? orgSettings.reminder_email_body
              .replace("{{organization_name}}", org?.name || "")
              .replace("{{invoice_number}}", invoice.invoice_number)
              .replace("{{family_group}}", invoice.family_group)
              .replace("{{balance_due}}", `$${invoice.balance_due.toFixed(2)}`)
              .replace("{{due_date}}", dueDate.toLocaleDateString())
          : `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #2563eb;">Payment Reminder</h2>
              <p>Dear ${familyGroup.lead_name || "Cabin Owner"},</p>
              
              <div style="background: ${reminderType === "overdue" ? "#fee2e2" : "#fef3c7"}; padding: 16px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0; font-size: 16px;">${urgencyText}</p>
              </div>

              <p>This is a friendly reminder about your outstanding invoice:</p>
              
              <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 20px 0;">
                <p><strong>Invoice Number:</strong> ${invoice.invoice_number}</p>
                <p><strong>Due Date:</strong> ${dueDate.toLocaleDateString()}</p>
                <p><strong>Balance Due:</strong> <span style="font-size: 20px; color: #2563eb;">$${invoice.balance_due.toFixed(2)}</span></p>
              </div>

              <p>Please submit your payment at your earliest convenience to avoid any late fees.</p>
              
              <p style="color: #6b7280; font-size: 14px;">
                Best regards,<br>
                ${org?.name || "Cabin Management"}
              </p>
            </div>
          `;

        try {
          // Send reminder email
          const { data: emailData, error: emailError } = await resend.emails.send({
            from: "Cabin Reminders <onboarding@resend.dev>",
            to: [familyGroup.lead_email],
            subject: emailSubject,
            html: emailBody,
          });

          if (emailError) {
            console.error("Error sending reminder email:", emailError);
            totalErrors++;
            
            // Log failed attempt
            await supabaseClient
              .from("invoice_reminders_log")
              .insert({
                organization_id: orgSettings.organization_id,
                invoice_id: invoice.id,
                reminder_type: reminderType,
                recipient_emails: [familyGroup.lead_email],
                email_status: "failed",
                error_message: emailError.message,
              });
            
            continue;
          }

          console.log(`Reminder sent for invoice ${invoice.invoice_number}:`, emailData);
          totalSent++;

          // Log successful send
          await supabaseClient
            .from("invoice_reminders_log")
            .insert({
              organization_id: orgSettings.organization_id,
              invoice_id: invoice.id,
              reminder_type: reminderType,
              recipient_emails: [familyGroup.lead_email],
              email_status: "sent",
            });

          // Update invoice status to overdue if past due
          if (daysUntilDue < 0 && invoice.status !== "overdue") {
            await supabaseClient
              .from("invoices")
              .update({ status: "overdue" })
              .eq("id", invoice.id);
          }
        } catch (error: any) {
          console.error("Error processing invoice reminder:", error);
          totalErrors++;
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed invoice reminders: ${totalSent} sent, ${totalErrors} errors`,
        total_sent: totalSent,
        total_errors: totalErrors,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in send-invoice-reminders function:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};

serve(handler);