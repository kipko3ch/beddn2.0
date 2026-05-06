import { NextResponse } from "next/server";
import {
  handleFailedPayment,
  handleSuccessfulPayment,
} from "@/lib/bookings/server";
import { verifyPaystackSignature } from "@/lib/payments/paystack";

interface PaystackWebhookEvent {
  event: string;
  data?: {
    reference?: string;
    status?: string;
    [key: string]: unknown;
  };
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-paystack-signature");

  if (!verifyPaystackSignature(rawBody, signature)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const event = JSON.parse(rawBody) as PaystackWebhookEvent;
  const reference = event.data?.reference;

  if (!reference) {
    return NextResponse.json({ ok: true });
  }

  if (event.event === "charge.success" || event.data?.status === "success") {
    await handleSuccessfulPayment(reference, event.data);
  } else if (event.data?.status === "failed") {
    await handleFailedPayment(reference, event.data);
  }

  return NextResponse.json({ ok: true });
}
