import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  // Must use the PUBLIC url: @supabase/ssr derives the auth cookie name from
  // this URL. The browser client uses the public URL, so this server client has
  // to match it to read the session cookie + PKCE verifier (Google OAuth code
  // exchange breaks otherwise). For latency, route heavy reads/writes through
  // the service-role admin client, which can safely use SUPABASE_INTERNAL_URL.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error("Missing Supabase environment variables");
  }

  const cookieStore = await cookies();

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Called from Server Component — ignore
        }
      },
    },
  });
}
