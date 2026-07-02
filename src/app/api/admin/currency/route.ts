import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { HOST_CURRENCIES } from "@/lib/currency";

const LIVE_RATE_TARGETS = HOST_CURRENCIES.filter((c) => c !== "USD");

// Frankfurter (ECB reference rates) doesn't track KES/TZS/UGX/RWF at all —
// confirmed it 404s on those codes, which are exactly the currencies this
// feature exists for. open.er-api.com (free, no key, backed by
// exchangerate-api.com's open tier) covers all of them.
const LIVE_RATE_SOURCE = "https://open.er-api.com/v6/latest/USD";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
  if (!profile?.is_admin) return null;
  return { user, admin };
}

export async function GET() {
  const auth = await requireAdmin();
  if (!auth) return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const { data, error } = await auth.admin
    .from("currency_rates")
    .select("currency, rate_to_usd, source, updated_at")
    .order("currency", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ rates: data ?? [] });
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth) return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const body = (await request.json().catch(() => ({}))) as {
    action?: "refresh" | "set";
    currency?: string;
    rate?: number;
  };

  if (body.action === "refresh") {
    let response: Response;
    try {
      response = await fetch(LIVE_RATE_SOURCE);
    } catch {
      return NextResponse.json({ error: "Could not reach the exchange-rate service." }, { status: 502 });
    }
    if (!response.ok) {
      return NextResponse.json({ error: "Exchange-rate service did not return rates." }, { status: 502 });
    }
    const json = (await response.json().catch(() => null)) as { result?: string; rates?: Record<string, number> } | null;
    if (!json || json.result !== "success" || !json.rates) {
      return NextResponse.json({ error: "Exchange-rate service returned an unexpected response." }, { status: 502 });
    }
    const rows = LIVE_RATE_TARGETS.filter((currency) => typeof json.rates![currency] === "number" && json.rates![currency] > 0).map(
      (currency) => ({
        currency,
        rate_to_usd: json.rates![currency],
        source: "live",
        updated_at: new Date().toISOString(),
        updated_by: auth.user.id,
      })
    );
    if (rows.length === 0) {
      return NextResponse.json({ error: "No usable rates for KES/TZS/UGX/RWF in the response." }, { status: 502 });
    }
    const { error } = await auth.admin.from("currency_rates").upsert(rows, { onConflict: "currency" });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true, updated: rows.map((r) => r.currency) });
  }

  if (body.action === "set") {
    const currency = (body.currency || "").toUpperCase().trim();
    const rate = Number(body.rate);
    if (!currency || !Number.isFinite(rate) || rate <= 0) {
      return NextResponse.json({ error: "Provide a currency and a positive rate." }, { status: 400 });
    }
    const { error } = await auth.admin.from("currency_rates").upsert(
      {
        currency,
        rate_to_usd: rate,
        source: "manual",
        updated_at: new Date().toISOString(),
        updated_by: auth.user.id,
      },
      { onConflict: "currency" }
    );
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}
