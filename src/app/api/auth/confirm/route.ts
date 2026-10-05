import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

// Lands here when someone taps the magic link emailed by /api/auth/magic-link.
// If tapped on a different device than the one that initiated the request,
// we display the 6-digit code so the user can enter it on the original device.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = (searchParams.get("type") ?? "magiclink") as EmailOtpType;
  const requestedNext = searchParams.get("next") ?? "/";
  const flowId = searchParams.get("flow_id");
  const code = searchParams.get("code");
  const email = searchParams.get("email") ?? "";
  const force = searchParams.get("force") === "1";

  const next =
    requestedNext.startsWith("/") && !requestedNext.startsWith("//")
      ? requestedNext
      : "/";

  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") ?? "https";
  const baseUrl = (
    process.env.NEXT_PUBLIC_SITE_URL ||
    (forwardedHost ? `${forwardedProto}://${forwardedHost}` : origin)
  ).replace(/\/$/, "");

  const expParam = searchParams.get("exp");
  const sigParam = searchParams.get("sig");

  // Validate 10-minute expiration if exp & sig are present
  if (tokenHash && expParam && sigParam) {
    const crypto = await import("crypto");
    const authSecret = process.env.SUPABASE_SERVICE_ROLE_KEY || "beddn-auth-secret";
    const expectedSig = crypto
      .createHmac("sha256", authSecret)
      .update(`${tokenHash}:${expParam}`)
      .digest("hex");

    const isSigValid = expectedSig === sigParam;
    const isExpired = Date.now() > Number(expParam);

    if (!isSigValid || isExpired) {
      return NextResponse.redirect(
        `${baseUrl}/auth/auth-code-error?reason=${isExpired ? "expired" : "invalid"}`
      );
    }
  }

  // Cross-device check: If a flow_id was registered and this device does not
  // carry the matching beddn_auth_flow cookie, this click originated from a
  // different device (e.g. phone clicked email while computer started sign-in).
  // Redirect to /auth/verify-code to show the 6-digit code for the other device.
  if (flowId && code && !force) {
    const cookieStore = await cookies();
    const storedFlowId = cookieStore.get("beddn_auth_flow")?.value;
    if (!storedFlowId || storedFlowId !== flowId) {
      const verifyParams = new URLSearchParams({
        code,
        email,
        next,
      });
      if (tokenHash) verifyParams.set("token_hash", tokenHash);
      if (type) verifyParams.set("type", type);
      if (expParam) verifyParams.set("exp", expParam);
      if (sigParam) verifyParams.set("sig", sigParam);
      return NextResponse.redirect(`${baseUrl}/auth/verify-code?${verifyParams.toString()}`);
    }
  }

  if (tokenHash) {
    const supabase = await createClient();
    const { error, data } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) {
      const userId = data.session?.user?.id;
      if (userId) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("is_admin")
          .eq("id", userId)
          .maybeSingle();
        if (profile?.is_admin) {
          return NextResponse.redirect(`${baseUrl}/host`);
        }
      }
      return NextResponse.redirect(`${baseUrl}${next}`);
    }
  }

  return NextResponse.redirect(`${baseUrl}/auth/auth-code-error`);
}
