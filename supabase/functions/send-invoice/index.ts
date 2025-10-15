import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendInvoiceRequest {
  invoice_id: string;
  organization_id: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
    );

    const { invoice_id, organization_id }: SendInvoiceRequest = await req.json();
    console.log("Sending invoice:", invoice_id);

    // Fetch invoice details
    const { data: invoice, error: invoiceError } = await supabaseClient
      .from("invoices")
      .select("*")
      .eq("id", invoice_id)
      .single();

    if (invoiceError || !invoice) {
      throw new Error("Invoice not found");
    }

    // Fetch organization settings for email template
    const { data: settings } = await supabaseClient
      .from("reservation_settings")
      .select("invoice_email_subject, invoice_email_body")
      .eq("organization_id", organization_id)
      .single();

    // Fetch organization details
    const { data: org } = await supabaseClient
      .from("organizations")
      .select("name")
      .eq("id", organization_id)
      .single();

    // Fetch family group contact email
    const { data: familyGroup } = await supabaseClient
      .from("family_groups")
      .select("lead_email, lead_name")
      .eq("organization_id", organization_id)
      .eq("name", invoice.family_group)
      .single();

    if (!familyGroup?.lead_email) {
      throw new Error("No contact email found for family group");
    }

    // Build email content
    const emailSubject = settings?.invoice_email_subject || 
      `Invoice ${invoice.invoice_number} from ${org?.name || "Cabin"}`;

    const lineItemsHtml = JSON.parse(invoice.line_items || "[]")
      .map((item: any) => `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${item.description}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">$${item.amount.toFixed(2)}</td>
        </tr>
      `).join("");

    const emailBody = settings?.invoice_email_body 
      ? settings.invoice_email_body
          .replace("{{organization_name}}", org?.name || "")
          .replace("{{invoice_number}}", invoice.invoice_number)
          .replace("{{family_group}}", invoice.family_group)
          .replace("{{total_amount}}", `$${invoice.total_amount.toFixed(2)}`)
          .replace("{{due_date}}", new Date(invoice.due_date).toLocaleDateString())
      : `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Invoice ${invoice.invoice_number}</h2>
          <p>Dear ${familyGroup.lead_name || "Cabin Owner"},</p>
          <p>Please find your invoice details below:</p>
          
          <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Invoice Number:</strong> ${invoice.invoice_number}</p>
            <p><strong>Issue Date:</strong> ${new Date(invoice.issue_date).toLocaleDateString()}</p>
            <p><strong>Due Date:</strong> ${new Date(invoice.due_date).toLocaleDateString()}</p>
          </div>

          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <thead>
              <tr style="background: #f9fafb;">
                <th style="padding: 8px; text-align: left; border-bottom: 2px solid #e5e7eb;">Description</th>
                <th style="padding: 8px; text-align: right; border-bottom: 2px solid #e5e7eb;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${lineItemsHtml}
            </tbody>
            <tfoot>
              <tr>
                <td style="padding: 8px; font-weight: bold;">Subtotal</td>
                <td style="padding: 8px; text-align: right;">$${invoice.subtotal.toFixed(2)}</td>
              </tr>
              ${invoice.tax_amount > 0 ? `
              <tr>
                <td style="padding: 8px;">Tax</td>
                <td style="padding: 8px; text-align: right;">$${invoice.tax_amount.toFixed(2)}</td>
              </tr>
              ` : ''}
              <tr style="background: #f9fafb;">
                <td style="padding: 12px; font-weight: bold; font-size: 18px;">Total Due</td>
                <td style="padding: 12px; text-align: right; font-weight: bold; font-size: 18px; color: #2563eb;">$${invoice.total_amount.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>

          ${invoice.notes ? `
          <div style="background: #fef3c7; padding: 12px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Notes:</strong> ${invoice.notes}</p>
          </div>
          ` : ''}

          <p>Thank you for your prompt payment.</p>
          <p style="color: #6b7280; font-size: 14px;">
            Best regards,<br>
            ${org?.name || "Cabin Management"}
          </p>
        </div>
      `;

    // Send email via Resend
    const { data: emailData, error: emailError } = await resend.emails.send({
      from: "Cabin Invoices <invoices@cabinbuddy.org>",
      to: [familyGroup.lead_email],
      subject: emailSubject,
      html: emailBody,
    });

    if (emailError) {
      console.error("Resend error:", emailError);
      throw emailError;
    }

    console.log("Email sent successfully:", emailData);

    // Update invoice status to 'sent' and set sent_at timestamp
    const { error: updateError } = await supabaseClient
      .from("invoices")
      .update({
        status: "sent",
        sent_at: new Date().toISOString(),
      })
      .eq("id", invoice_id);

    if (updateError) {
      console.error("Error updating invoice status:", updateError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Invoice sent successfully",
        email_id: emailData?.id 
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in send-invoice function:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};

serve(handler);