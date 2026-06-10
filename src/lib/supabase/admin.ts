import { createClient } from "@supabase/supabase-js";

export function createAdminClient() {
  const publicUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const internalUrl = process.env.SUPABASE_INTERNAL_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!publicUrl || !key) {
    throw new Error("Missing Supabase admin environment variables");
  }

  // Prefer the internal address (skips the public domain's TLS/proxy hop), but
  // if it's unreachable — e.g. the Docker network isn't wired after a redeploy —
  // transparently retry the same request against the public URL so the app
  // keeps working instead of failing with "fetch failed".
  const base = internalUrl || publicUrl;

  const fetchWithFallback: typeof fetch = async (input, init) => {
    try {
      return await fetch(input as Parameters<typeof fetch>[0], init);
    } catch (err) {
      const original =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : (input as Request).url;

      if (!internalUrl || !original.startsWith(internalUrl)) throw err;

      const rewritten = publicUrl + original.slice(internalUrl.length);
      if (typeof input === "string" || input instanceof URL) {
        return await fetch(rewritten, init);
      }
      return await fetch(new Request(rewritten, input as Request));
    }
  };

  return createClient(base, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: { fetch: fetchWithFallback },
  });
}
