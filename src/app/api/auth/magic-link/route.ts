import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email/server";
import { magicLinkEmail } from "@/lib/email/templates";
import { publicBaseUrl } from "@/lib/site-url";

// Passwordless sign-in. Supabase's built-in email isn't configured here (all
// transactional mail goes through ZeptoMail), so instead of relying on
// supabase.auth.signInWithOtp — whose email never arrives — we generate the
// link with the admin client and deliver it ourselves. The link points at
// /api/auth/confirm, which verifies the token_hash and sets the session.

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

  const baseUrl = publicBaseUrl(request);
  const next = safeNext(body.next);
  const admin = createAdminClient();

  // No redirectTo: we don't use the generated action_link, only its
  // hashed_token, so we avoid any "redirect URL not allowed" rejection.
  async function generate() {
    return admin.auth.admin.generateLink({ type: "magiclink", email });
  }

  let { data, error } = await generate();
  if (error || !data?.properties?.hashed_token) {
    // Most likely the user doesn't exist yet (magiclink can't create one).
    // Create the account, then retry — mirrors shouldCreateUser: true.
    await admin.auth.admin.createUser({ email, email_confirm: false });
    ({ data, error } = await generate());
  }

  if (error || !data?.properties?.hashed_token) {
    console.error("magic-link: generateLink failed", error?.message);
    return NextResponse.json(
      { error: "Could not create your sign-in link. Please try again." },
      { status: 500 }
    );
  }

  const confirmUrl = `${baseUrl}/api/auth/confirm?token_hash=${encodeURIComponent(
    data.properties.hashed_token
  )}&type=magiclink&next=${encodeURIComponent(next)}`;

  const { subject, html } = magicLinkEmail({ url: confirmUrl });
  const result = await sendEmail({ to: email, subject, html, eventType: "magic_link" });

  // If the email didn't actually go out, tell the user instead of a false
  // "check your inbox". "logged" means ZEPTOMAIL_TOKEN isn't configured.
  if (result.status !== "sent") {
    console.error("magic-link: email not sent", result.status, result.error);
    const message =
      result.status === "logged"
        ? "Email isn't configured on the server (ZEPTOMAIL_TOKEN missing)."
        : "We couldn't send the email right now. Please try again.";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
