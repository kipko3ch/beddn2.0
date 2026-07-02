import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Next.js 16 "proxy" (formerly middleware). Three jobs:
//   1. Refresh the Supabase session cookie so pages never read a stale user.
//   2. Server-gate the host Extranet (/host/*) and admin (/admin/*) so a
//      signed-out visitor can never load them.
//   3. Expose the pathname to server layouts via an x-pathname header (server
//      components can't read the path otherwise) — the host layout uses it to
//      render /host/login without the dashboard chrome.
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
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
