import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM_EMAIL = Deno.env.get("RFQ_FROM_EMAIL") || "rfq@bolsover.ae";
const COMPANY_NAME = Deno.env.get("COMPANY_NAME") || "Bolsover Interiors";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface RFQItem {
  description: string;
  quantity: number;
  unit: string;
}

interface SendRFQPayload {
  rfq_id: string;
  to_email: string;
  subcontractor_name: string;
  rfq_reference: string;
  items: RFQItem[];
  due_date: string | null;
  boq_reference: string;
  project_reference: string;
}

function buildEmailHTML(payload: SendRFQPayload): string {
  const itemRows = payload.items
    .map(
      (item, i) => `
    <tr style="border-bottom:1px solid #eee">
      <td style="padding:8px 12px;font-size:13px">${i + 1}</td>
      <td style="padding:8px 12px;font-size:13px">${item.description}</td>
      <td style="padding:8px 12px;font-size:13px;text-align:center">${item.quantity}</td>
      <td style="padding:8px 12px;font-size:13px;text-align:center">${item.unit}</td>
      <td style="padding:8px 12px;font-size:13px">Your price</td>
    </tr>
  `
    )
    .join("");

  const dueDateLine = payload.due_date
    ? `<p style="font-size:14px;color:#333"><strong>Response due by:</strong> ${payload.due_date}</p>`
    : "";

  return `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:680px;margin:0 auto;padding:20px">
      <div style="background:#1a1a2e;padding:24px 32px;border-radius:10px 10px 0 0">
        <h1 style="color:#fff;font-size:20px;margin:0">${COMPANY_NAME}</h1>
        <p style="color:#aab;font-size:13px;margin:4px 0 0">Request for Quotation</p>
      </div>
      <div style="background:#fff;padding:24px 32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 10px 10px">
        <p style="font-size:14px;color:#333">Dear ${payload.subcontractor_name},</p>
        <p style="font-size:14px;color:#333">
          We invite you to submit your quotation for the following items
          ${payload.project_reference ? `for project <strong>${payload.project_reference}</strong>` : ""}.
        </p>
        <p style="font-size:13px;color:#666">RFQ Reference: <strong>${payload.rfq_reference}</strong></p>
        ${dueDateLine}
        <table style="width:100%;border-collapse:collapse;margin:20px 0;border:1px solid #e5e7eb;border-radius:6px;overflow:hidden">
          <thead>
            <tr style="background:#f8fafc">
              <th style="padding:10px 12px;font-size:11px;text-transform:uppercase;color:#64748b;text-align:left">#</th>
              <th style="padding:10px 12px;font-size:11px;text-transform:uppercase;color:#64748b;text-align:left">Description</th>
              <th style="padding:10px 12px;font-size:11px;text-transform:uppercase;color:#64748b;text-align:center">Qty</th>
              <th style="padding:10px 12px;font-size:11px;text-transform:uppercase;color:#64748b;text-align:center">Unit</th>
              <th style="padding:10px 12px;font-size:11px;text-transform:uppercase;color:#64748b;text-align:left">Unit Price</th>
            </tr>
          </thead>
          <tbody>${itemRows}</tbody>
        </table>
        <p style="font-size:14px;color:#333">
          Please reply to this email with your completed quotation, including unit prices for each item listed above.
        </p>
        <p style="font-size:14px;color:#333">Thank you,<br><strong>${COMPANY_NAME}</strong></p>
      </div>
      <p style="font-size:11px;color:#999;text-align:center;margin-top:16px">
        This is an automated message from ${COMPANY_NAME} procurement system.
      </p>
    </div>
  `;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const payload: SendRFQPayload = await req.json();

    if (!payload.to_email) {
      throw new Error("Subcontractor has no email address configured");
    }

    if (!RESEND_API_KEY) {
      throw new Error(
        "RESEND_API_KEY not configured. Set it in Supabase Edge Function secrets."
      );
    }

    const html = buildEmailHTML(payload);

    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [payload.to_email],
        subject: `RFQ ${payload.rfq_reference} — ${COMPANY_NAME}`,
        html,
      }),
    });

    const emailData = await emailRes.json();

    if (!emailRes.ok) {
      throw new Error(
        `Email API error: ${emailData.message || JSON.stringify(emailData)}`
      );
    }

    return new Response(
      JSON.stringify({ success: true, email_id: emailData.id }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: (err as Error).message }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
