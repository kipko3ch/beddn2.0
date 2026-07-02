import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { HOST_PIN_COOKIE, verifyHostUnlock } from "@/lib/host-pin";
import { ROUTES } from "@/lib/routes";

// Next.js 16 "proxy" (formerly middleware). Four jobs:
//   1. Refresh the Supabase session cookie so pages never read a stale user.
//   2. Server-gate the host Extranet (/host/*) and admin (/admin/*) so a
//      signed-out visitor can never load them.
//   3. Require a second factor (a 4-digit PIN, independent of the Supabase
//      session) before the Extranet unlocks — entering /host or /admin is
//      never just a role switch on the same login. See src/lib/host-pin.ts.
//   4. Expose the pathname to server layouts via an x-pathname header (server
//      components can't read the path otherwise) — the host layout uses it to
//      render /host/login and /host/unlock without the dashboard chrome.
export async function proxy(request: NextRequest) {
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

  // The dedicated host sign-in and PIN-unlock pages stay public; everything
  // else under /host and all of /admin require a signed-in user.
  const isUnlockPage = pathname === ROUTES.hostUnlock;
  const isHostArea = pathname.startsWith("/host") && pathname !== "/host/login" && !isUnlockPage;
  const isAdminArea = pathname.startsWith("/admin");

  if (!user && (isHostArea || isAdminArea || isUnlockPage)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = isAdminArea ? "/" : "/host/login";
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  // Signed in and inside the Extranet: also require the PIN unlock cookie.
  // This is the "another auth" step — a shared login can still switch roles,
  // but the dashboard itself never opens without it.
  if (user && (isHostArea || isAdminArea)) {
    const unlockCookie = request.cookies.get(HOST_PIN_COOKIE)?.value;
    const unlocked = await verifyHostUnlock(unlockCookie, user.id);
    if (!unlocked) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = ROUTES.hostUnlock;
      redirectUrl.search = `?next=${encodeURIComponent(pathname)}`;
      return NextResponse.redirect(redirectUrl);
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
