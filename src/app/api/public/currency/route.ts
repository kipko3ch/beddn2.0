import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Cached admin-maintained rates (no live API call per request — fast, and
// works even when Frankfurter is unreachable). See /admin/currency.
export async function GET() {
  const admin = createAdminClient();
  const { data } = await admin.from("currency_rates").select("currency, rate_to_usd, updated_at");

  const rates: Record<string, number> = { USD: 1 };
  let updatedAt: string | null = null;
  for (const row of (data ?? []) as { currency: string; rate_to_usd: number; updated_at: string }[]) {
    rates[row.currency] = Number(row.rate_to_usd);
    if (!updatedAt || row.updated_at > updatedAt) updatedAt = row.updated_at;
  }

  return NextResponse.json({ rates, updatedAt });
}
