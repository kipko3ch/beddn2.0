import { createAdminClient } from "@/lib/supabase/admin";

type NotificationChannel = "sms" | "whatsapp" | "email";

interface SendSmsInput {
  to: string;
  message: string;
  bookingId?: string | null;
  eventType: string;
}

function providerName() {
  return (process.env.SMS_PROVIDER || "log").toLowerCase();
}

async function sendViaAfricaTalking(to: string, message: string) {
  const apiKey = process.env.AFRICASTALKING_API_KEY;
  const username = process.env.AFRICASTALKING_USERNAME;
  const sender = process.env.AFRICASTALKING_SENDER_ID;
  const sandbox = process.env.AFRICASTALKING_SANDBOX === "true";

  if (!apiKey || !username) {
    throw new Error("Missing Africa's Talking SMS credentials");
  }

  const body = new URLSearchParams();
  body.set("username", username);
  body.set("to", to);
  body.set("message", message);
  if (sender) body.set("from", sender);

  const response = await fetch(
    sandbox
      ? "https://api.sandbox.africastalking.com/version1/messaging"
      : "https://api.africastalking.com/version1/messaging",
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
        apiKey,
      },
      body,
    }
  );

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(JSON.stringify(data));
  }
  return data;
}

async function sendViaCustomProvider(to: string, message: string) {
  const url = process.env.SMS_PROVIDER_URL;
  if (!url) {
    throw new Error("Missing SMS_PROVIDER_URL");
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: process.env.SMS_PROVIDER_AUTH
        ? `Bearer ${process.env.SMS_PROVIDER_AUTH}`
        : "",
    },
    body: JSON.stringify({
      to,
      message,
      from: process.env.SMS_FROM || "Beddn",
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(JSON.stringify(data));
  }
  return data;
}

export async function sendSms({ to, message, bookingId, eventType }: SendSmsInput) {
  const supabase = createAdminClient();
  const provider = providerName();
  let status = "sent";
  let errorMessage: string | null = null;
  let rawResponse: unknown = null;

  try {
    if (provider === "africas_talking") {
      rawResponse = await sendViaAfricaTalking(to, message);
    } else if (provider === "custom") {
      rawResponse = await sendViaCustomProvider(to, message);
    } else {
      status = "logged";
      rawResponse = { disabled: true, provider: "log" };
    }
  } catch (error) {
    status = "failed";
    errorMessage = error instanceof Error ? error.message : "SMS failed";
  }

  await supabase.from("sms_logs").insert({
    recipient_phone: to,
    message,
    provider,
    status,
    booking_id: bookingId || null,
    error_message: errorMessage,
  });

  await supabase.from("notification_logs").insert({
    channel: "sms" satisfies NotificationChannel,
    event_type: eventType,
    recipient: to,
    message,
    provider,
    status,
    booking_id: bookingId || null,
    error_message: errorMessage,
    raw_response: rawResponse,
  });

  if (errorMessage) {
    throw new Error(errorMessage);
  }
}

export async function sendAdminSms(message: string, bookingId?: string | null) {
  const recipients = (process.env.ADMIN_PHONE_NUMBERS || "")
    .split(",")
    .map((phone) => phone.trim())
    .filter(Boolean);

  await Promise.all(
    recipients.map((to) =>
      sendSms({
        to,
        message,
        bookingId,
        eventType: "admin_alert",
      }).catch(() => undefined)
    )
  );
}

export async function sendWhatsAppPlaceholder() {
  return {
    disabled: true,
    reason: "WhatsApp channel is reserved for a later integration.",
  };
}
