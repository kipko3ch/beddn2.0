import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Single edge middleware for the whole app. It does three jobs:
//   1. Refreshes the Supabase session cookie so pages never fetch a stale user.
//   2. Server-gates the host Extranet (/host/*) and admin (/admin/*) areas so a
//      signed-out visitor can never load them — the click-lag "flash of a
//      dashboard then redirect" is gone.
//   3. Exposes the current pathname to server layouts via an x-pathname header
//      (Next.js server components can't read the path otherwise), so the host
//      layout can render /host/login without the dashboard chrome.
//
// Deeper role checks (approved host, admin) run in the server layouts, which is
// where they belong — this keeps the edge fast.
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", pathname);

  let response = NextResponse.next({ request: { headers: requestHeaders } });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request: { headers: requestHeaders } });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // The dedicated host sign-in page stays public; everything else under /host
  // and all of /admin require a signed-in user.
  const isHostArea = pathname.startsWith("/host") && pathname !== "/host/login";
  const isAdminArea = pathname.startsWith("/admin");

  if (!user && (isHostArea || isAdminArea)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = isAdminArea ? "/" : "/host/login";
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

export const config = {
  // Only the gated areas need the session refresh + guard. Public pages stay
  // fast (no extra auth round-trip); the browser client keeps their session
  // fresh on its own.
  matcher: ["/host/:path*", "/admin/:path*"],
};
