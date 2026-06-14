import { createAdminClient } from "@/lib/supabase/admin";

// Transactional email via ZeptoMail. Safe to call without credentials: if
// ZEPTOMAIL_TOKEN is unset it logs the email (status "logged") instead of
// sending, mirroring the SMS provider's log fallback. Never throws.

interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  eventType: string;
}

function fromAddress(): { address: string; name: string } {
  return {
    address: process.env.ZEPTOMAIL_FROM || "no-reply@beddn.com",
    name: process.env.ZEPTOMAIL_FROM_NAME || "Beddn",
  };
}

async function sendViaZeptoMail(input: SendEmailInput) {
  const token = process.env.ZEPTOMAIL_TOKEN;
  // ZeptoMail regional host (api.zeptomail.com / .eu / .in). Defaults to .com.
  const base = process.env.ZEPTOMAIL_API_URL || "https://api.zeptomail.com/v1.1/email";
  const from = fromAddress();

  const response = await fetch(base, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      // ZeptoMail expects the literal "Zoho-enczapikey <token>" scheme.
      Authorization: token!.startsWith("Zoho-enczapikey") ? token! : `Zoho-enczapikey ${token}`,
    },
    body: JSON.stringify({
      from: { address: from.address, name: from.name },
      to: [{ email_address: { address: input.to } }],
      subject: input.subject,
      htmlbody: input.html,
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(typeof data === "string" ? data : JSON.stringify(data));
  }
  return data;
}

export interface SendEmailResult {
  status: "sent" | "logged" | "failed";
  error?: string;
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  if (!input.to || !input.to.includes("@")) {
    return { status: "failed", error: "No usable email address" };
  }

  const supabase = createAdminClient();
  const configured = Boolean(process.env.ZEPTOMAIL_TOKEN);
  let status = "sent";
  let errorMessage: string | null = null;
  let raw: unknown = null;

  try {
    if (configured) {
      raw = await sendViaZeptoMail(input);
    } else {
      status = "logged";
      raw = { disabled: true, provider: "log" };
    }
  } catch (error) {
    status = "failed";
    errorMessage = error instanceof Error ? error.message : "Email failed";
  }

  // Reuse the existing in-app notification log (channel "email").
  await supabase
    .from("notification_logs")
    .insert({
      channel: "email",
      event_type: input.eventType,
      recipient: input.to,
      message: input.subject,
      provider: "zeptomail",
      status,
      error_message: errorMessage,
      raw_response: raw,
    })
    .then(() => undefined, () => undefined);

  return { status: status as SendEmailResult["status"], error: errorMessage ?? undefined };
}
