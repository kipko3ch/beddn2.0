import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email/server";
import { magicLinkEmail } from "@/lib/email/templates";

// Passwordless sign-in. Supabase's built-in email isn't configured here (all
// transactional mail goes through ZeptoMail), so instead of relying on
// supabase.auth.signInWithOtp — whose email never arrives — we generate the
// link with the admin client and deliver it ourselves. The link points at
// /api/auth/confirm, which verifies the token_hash and sets the session.

function baseUrlFrom(request: Request): string {
  const { origin } = new URL(request.url);
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") ?? "https";
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    (forwardedHost ? `${forwardedProto}://${forwardedHost}` : origin)
  ).replace(/\/$/, "");
}

function safeNext(next: unknown): string {
  return typeof next === "string" && next.startsWith("/") && !next.startsWith("//")
    ? next
    : "/";
}

export async function POST(request: Request) {
  let body: { email?: string; next?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const email = (body.email || "").trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  const baseUrl = baseUrlFrom(request);
  const next = safeNext(body.next);
  const admin = createAdminClient();

  async function generate() {
    return admin.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: { redirectTo: `${baseUrl}/api/auth/confirm` },
    });
  }

  let { data, error } = await generate();
  if (error || !data?.properties?.hashed_token) {
    // Most likely the user doesn't exist yet (magiclink can't create one).
    // Create the account, then retry — mirrors shouldCreateUser: true.
    await admin.auth.admin.createUser({ email, email_confirm: false });
    ({ data, error } = await generate());
  }

  if (error || !data?.properties?.hashed_token) {
    return NextResponse.json(
      { error: "Could not create your sign-in link. Please try again." },
      { status: 500 }
    );
  }

  const confirmUrl = `${baseUrl}/api/auth/confirm?token_hash=${encodeURIComponent(
    data.properties.hashed_token
  )}&type=magiclink&next=${encodeURIComponent(next)}`;

  const { subject, html } = magicLinkEmail({ url: confirmUrl });
  await sendEmail({ to: email, subject, html, eventType: "magic_link" });

  return NextResponse.json({ ok: true });
}
