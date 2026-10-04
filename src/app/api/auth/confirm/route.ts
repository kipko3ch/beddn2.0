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
