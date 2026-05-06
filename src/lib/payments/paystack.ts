import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { toPaystackSubunit } from "@/lib/bookings/shared";

const PAYSTACK_BASE_URL = "https://api.paystack.co";

interface InitializePaystackInput {
  amount: number;
  currency: string;
  email: string;
  reference: string;
  callbackUrl: string;
  metadata?: Record<string, unknown>;
}

function secretKey() {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) {
    throw new Error("Missing PAYSTACK_SECRET_KEY");
  }
  return key;
}

export function generatePaystackReference() {
  return `BEDDN-${Date.now().toString(36).toUpperCase()}-${randomBytes(4)
    .toString("hex")
    .toUpperCase()}`;
}

export async function initializePaystackTransaction(input: InitializePaystackInput) {
  const response = await fetch(`${PAYSTACK_BASE_URL}/transaction/initialize`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: String(toPaystackSubunit(input.amount, input.currency)),
      currency: input.currency,
      email: input.email,
      reference: input.reference,
      callback_url: input.callbackUrl,
      metadata: input.metadata,
    }),
  });

  const data = await response.json();
  if (!response.ok || !data.status) {
    throw new Error(data.message || "Paystack initialization failed");
  }

  return data.data as {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

export async function verifyPaystackTransaction(reference: string) {
  const response = await fetch(
    `${PAYSTACK_BASE_URL}/transaction/verify/${encodeURIComponent(reference)}`,
    {
      headers: {
        Authorization: `Bearer ${secretKey()}`,
      },
      cache: "no-store",
    }
  );

  const data = await response.json();
  if (!response.ok || !data.status) {
    throw new Error(data.message || "Paystack verification failed");
  }

  return data.data as {
    status: string;
    reference: string;
    amount: number;
    currency: string;
    customer?: { email?: string };
    [key: string]: unknown;
  };
}

export function verifyPaystackSignature(rawBody: string, signature: string | null) {
  if (!signature) return false;

  const expected = createHmac("sha512", secretKey()).update(rawBody).digest("hex");
  const actual = Buffer.from(signature, "hex");
  const expectedBuffer = Buffer.from(expected, "hex");

  if (actual.length !== expectedBuffer.length) return false;
  return timingSafeEqual(actual, expectedBuffer);
}
