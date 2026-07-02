import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { HOST_CURRENCIES } from "@/lib/currency";

const FRANKFURTER_TARGETS = HOST_CURRENCIES.filter((c) => c !== "USD");

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
      response = await fetch(
        `https://api.frankfurter.app/latest?from=USD&to=${FRANKFURTER_TARGETS.join(",")}`
      );
    } catch {
      return NextResponse.json({ error: "Could not reach Frankfurter." }, { status: 502 });
    }
    if (!response.ok) {
      return NextResponse.json({ error: "Frankfurter did not return rates." }, { status: 502 });
    }
    const json = (await response.json()) as { rates?: Record<string, number> };
    const fetched = json.rates ?? {};
    const rows = Object.entries(fetched)
      .filter(([, rate]) => typeof rate === "number" && rate > 0)
      .map(([currency, rate_to_usd]) => ({
        currency,
        rate_to_usd,
        source: "frankfurter",
        updated_at: new Date().toISOString(),
        updated_by: auth.user.id,
      }));
    if (rows.length === 0) {
      return NextResponse.json({ error: "Frankfurter returned no usable rates." }, { status: 502 });
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
