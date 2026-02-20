import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ZOHO_CLIENT_ID = Deno.env.get("ZOHO_CLIENT_ID")!;
const ZOHO_CLIENT_SECRET = Deno.env.get("ZOHO_CLIENT_SECRET")!;
const ZOHO_REFRESH_TOKEN = Deno.env.get("ZOHO_REFRESH_TOKEN")!;
const ZOHO_ORG_ID = Deno.env.get("ZOHO_ORG_ID")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Get a fresh Zoho access token using refresh token
async function getAccessToken(): Promise<string> {
  const res = await fetch("https://accounts.zoho.com/oauth/v2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: ZOHO_CLIENT_ID,
      client_secret: ZOHO_CLIENT_SECRET,
      refresh_token: ZOHO_REFRESH_TOKEN,
    }),
  });
  const data = await res.json();
  if (!data.access_token) throw new Error(`Zoho auth failed: ${JSON.stringify(data)}`);
  return data.access_token;
}

// Call Zoho Books API
async function zohoAPI(token: string, method: string, endpoint: string, body?: object) {
  const url = `https://www.zohoapis.com/books/v3${endpoint}?organization_id=${ZOHO_ORG_ID}`;
  const options: RequestInit = {
    method,
    headers: {
      "Authorization": `Zoho-oauthtoken ${token}`,
      "Content-Type": "application/json",
    },
  };
  if (body) options.body = JSON.stringify(body);
  const res = await fetch(url, options);
  const data = await res.json();
  if (data.code !== 0) throw new Error(`Zoho API error: ${data.message || JSON.stringify(data)}`);
  return data;
}

// Find or create a Zoho contact from a client name/email
async function findOrCreateContact(token: string, client: { name: string; email?: string; phone?: string }) {
  const searchUrl = `https://www.zohoapis.com/books/v3/contacts?organization_id=${ZOHO_ORG_ID}&contact_name=${encodeURIComponent(client.name)}`;
  const searchRes = await fetch(searchUrl, {
    headers: { "Authorization": `Zoho-oauthtoken ${token}` },
  });
  const searchData = await searchRes.json();

  if (searchData.contacts && searchData.contacts.length > 0) {
    return searchData.contacts[0].contact_id;
  }

  const createData = await zohoAPI(token, "POST", "/contacts", {
    contact_name: client.name,
    contact_type: "customer",
    contact_persons: client.email ? [{ email: client.email, is_primary_contact: true }] : undefined,
    phone: client.phone || undefined,
  });
  return createData.contact.contact_id;
}

// Sync an invoice to Zoho Books
async function syncInvoice(supabase: any, token: string, invoiceId: string) {
  const { data: invoice, error } = await supabase
    .from("invoices")
    .select("*, project:projects(reference, contract_value, client:clients(name, email, phone))")
    .eq("id", invoiceId)
    .single();

  if (error || !invoice) throw new Error(`Invoice not found: ${error?.message}`);

  const clientName = invoice.project?.client?.name;
  if (!clientName) throw new Error("Invoice has no client linked via project");

  const contactId = await findOrCreateContact(token, {
    name: clientName,
    email: invoice.project?.client?.email,
    phone: invoice.project?.client?.phone,
  });

  const invoiceDate = invoice.issued_date || new Date().toISOString().split("T")[0];
  const dueDate = invoice.due_date || undefined;

  const lineItems = [{
    name: invoice.description || `Invoice ${invoice.reference || ""}`.trim(),
    description: `Project: ${invoice.project?.reference || "N/A"}${invoice.invoice_type ? ` | Type: ${invoice.invoice_type}` : ""}`,
    rate: invoice.amount || 0,
    quantity: 1,
  }];

  if (invoice.zoho_invoice_id) {
    await zohoAPI(token, "PUT", `/invoices/${invoice.zoho_invoice_id}`, {
      customer_id: contactId,
      invoice_number: invoice.reference || undefined,
      date: invoiceDate,
      due_date: dueDate,
      line_items: lineItems,
      notes: `Synced from BolsoverOS`,
    });

    await supabase.from("invoices").update({
      zoho_sync_at: new Date().toISOString(),
    }).eq("id", invoiceId);

    return { zoho_invoice_id: invoice.zoho_invoice_id, action: "updated" };
  } else {
    const data = await zohoAPI(token, "POST", "/invoices", {
      customer_id: contactId,
      invoice_number: invoice.reference || undefined,
      date: invoiceDate,
      due_date: dueDate,
      line_items: lineItems,
      notes: `Synced from BolsoverOS`,
    });

    const zohoInvoiceId = data.invoice.invoice_id;

    await supabase.from("invoices").update({
      zoho_invoice_id: zohoInvoiceId,
      zoho_sync_at: new Date().toISOString(),
    }).eq("id", invoiceId);

    return { zoho_invoice_id: zohoInvoiceId, action: "created" };
  }
}

// Record a payment in Zoho Books
async function syncPayment(supabase: any, token: string, paymentData: {
  invoice_id: string;
  amount: number;
  payment_date: string;
  method?: string;
  reference?: string;
}) {
  const { data: invoice } = await supabase
    .from("invoices")
    .select("zoho_invoice_id, amount, project:projects(client:clients(name))")
    .eq("id", paymentData.invoice_id)
    .single();

  if (!invoice?.zoho_invoice_id) {
    throw new Error("Invoice not synced to Zoho yet. Sync the invoice first.");
  }

  const clientName = invoice.project?.client?.name;
  if (!clientName) throw new Error("No client found");
  const contactId = await findOrCreateContact(token, { name: clientName });

  const paymentMode = paymentData.method === "bank_transfer" ? "Bank Transfer"
    : paymentData.method === "cheque" ? "Check"
    : paymentData.method === "cash" ? "Cash"
    : paymentData.method === "card" ? "Credit Card"
    : undefined;

  const data = await zohoAPI(token, "POST", "/customerpayments", {
    customer_id: contactId,
    payment_mode: paymentMode,
    amount: paymentData.amount,
    date: paymentData.payment_date,
    reference_number: paymentData.reference || undefined,
    invoices: [{
      invoice_id: invoice.zoho_invoice_id,
      amount_applied: paymentData.amount,
    }],
  });

  return { zoho_payment_id: data.payment.payment_id, action: "created" };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { action, invoice_id, payment } = await req.json();

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const token = await getAccessToken();

    let result;

    switch (action) {
      case "sync-invoice":
        if (!invoice_id) throw new Error("invoice_id required");
        result = await syncInvoice(supabase, token, invoice_id);
        break;

      case "sync-payment":
        if (!payment) throw new Error("payment data required");
        result = await syncPayment(supabase, token, payment);
        break;

      case "test":
        const testRes = await fetch(
          `https://www.zohoapis.com/books/v3/organization?organization_id=${ZOHO_ORG_ID}`,
          { headers: { "Authorization": `Zoho-oauthtoken ${token}` } }
        );
        result = await testRes.json();
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify({ success: true, ...result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
