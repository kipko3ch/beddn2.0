import { createClient } from "@supabase/supabase-js";

export function createAdminClient() {
  // Server-only client — use the internal address when available to avoid the
  // public domain's TLS/proxy round-trip on every query.
  const url =
    process.env.SUPABASE_INTERNAL_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Missing Supabase admin environment variables");
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
