"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DashboardListSkeleton } from "@/components/dashboard-skeletons";
import { HOST_CURRENCIES } from "@/lib/currency";
import { RefreshCw } from "lucide-react";

type RateRow = { currency: string; rate_to_usd: number; source: string; updated_at: string };

export default function AdminCurrencyPage() {
  const [rates, setRates] = useState<RateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingCurrency, setSavingCurrency] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function load() {
    const res = await fetch("/api/admin/currency");
    const json = (await res.json().catch(() => ({}))) as { rates?: RateRow[] };
    setRates(json.rates ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function refresh() {
    setRefreshing(true);
    setError("");
    const res = await fetch("/api/admin/currency", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "refresh" }),
    });
    const json = (await res.json().catch(() => ({}))) as { error?: string };
    setRefreshing(false);
    if (!res.ok) {
      setError(json.error || "Could not refresh from Frankfurter.");
      return;
    }
    await load();
  }

  async function setManual(currency: string) {
    const rate = Number(drafts[currency]);
    if (!Number.isFinite(rate) || rate <= 0) {
      setError(`Enter a valid rate for ${currency}.`);
      return;
    }
    setSavingCurrency(currency);
    setError("");
    const res = await fetch("/api/admin/currency", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "set", currency, rate }),
    });
    const json = (await res.json().catch(() => ({}))) as { error?: string };
    setSavingCurrency(null);
    if (!res.ok) {
      setError(json.error || "Could not save that rate.");
      return;
    }
    setDrafts((d) => ({ ...d, [currency]: "" }));
    await load();
  }

  const byCurrency = new Map(rates.map((r) => [r.currency, r]));

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-brand text-3xl text-[#2b000a]">Currency</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Rates guests see when they switch the currency display. Pull live rates, or set a
            manual average yourself.
          </p>
        </div>
        <Button onClick={refresh} disabled={refreshing} className="gap-2 rounded-full bg-[#800020] hover:bg-[#600018]">
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          {refreshing ? "Refreshing…" : "Refresh live rates"}
        </Button>
      </div>

      {error && <p className="mb-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {loading ? (
        <DashboardListSkeleton rows={4} />
      ) : (
        <div className="divide-y rounded-2xl border bg-white">
          <div className="flex items-center justify-between gap-3 p-4">
            <div>
              <p className="font-semibold text-[#2b000a]">USD</p>
              <p className="text-sm text-muted-foreground">Base currency — always 1.00</p>
            </div>
          </div>
          {HOST_CURRENCIES.filter((c) => c !== "USD").map((currency) => {
            const row = byCurrency.get(currency);
            return (
              <div key={currency} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-[#2b000a]">{currency}</p>
                    {row ? (
                      <Badge className={`text-xs capitalize ${row.source === "live" ? "bg-green-100 text-green-800 hover:bg-green-100" : "bg-amber-100 text-amber-800 hover:bg-amber-100"}`}>
                        {row.source}
                      </Badge>
                    ) : (
                      <Badge className="bg-zinc-200 text-xs text-zinc-700 hover:bg-zinc-200">not set</Badge>
                    )}
                  </div>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {row
                      ? `1 USD ≈ ${currency} ${Number(row.rate_to_usd).toLocaleString()} · updated ${new Date(row.updated_at).toLocaleString()}`
                      : "No rate yet — refresh or set one manually."}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder={row ? String(row.rate_to_usd) : "Rate to USD"}
                    value={drafts[currency] ?? ""}
                    onChange={(e) => setDrafts((d) => ({ ...d, [currency]: e.target.value }))}
                    className="h-9 w-36 rounded-full"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={savingCurrency === currency}
                    onClick={() => setManual(currency)}
                    className="rounded-full"
                  >
                    Set
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
