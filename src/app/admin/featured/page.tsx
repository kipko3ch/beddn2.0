"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { DashboardTableSkeleton } from "@/components/dashboard-skeletons";
import { ROUTES } from "@/lib/routes";
import type { FeaturedListing, FeaturedStatus } from "@/lib/types";

type Row = FeaturedListing & { listing?: { name?: string | null; title?: string | null; city?: string | null } | null };

const PLACEMENT_FILTERS = ["all", "homepage_featured", "city_featured", "category_featured", "search_boost"];
const STATUS_FILTERS = ["all", "active", "scheduled", "expired", "cancelled"];
const PAYMENT_FILTERS = ["all", "unpaid", "paid", "complimentary", "refunded"];

const STATUS_STYLES: Record<string, string> = {
  active: "bg-green-100 text-green-800",
  scheduled: "bg-blue-100 text-blue-800",
  expired: "bg-zinc-200 text-zinc-600",
  cancelled: "bg-red-100 text-red-800",
};

// What the placement effectively is right now, regardless of the stored value.
function effectiveStatus(row: Row): FeaturedStatus {
  if (row.status === "cancelled") return "cancelled";
  const now = Date.now();
  if (new Date(row.end_date).getTime() < now) return "expired";
  if (new Date(row.start_date).getTime() > now) return "scheduled";
  return row.status === "expired" ? "expired" : "active";
}

function fmt(value?: string) {
  return value ? new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "—";
}

const selectClass =
  "h-9 rounded-full border bg-white px-3 text-xs font-bold text-[#202124] outline-none";

export default function AdminFeaturedPage() {
  const supabase = createClient();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [placement, setPlacement] = useState("all");
  const [status, setStatus] = useState("all");
  const [payment, setPayment] = useState("all");
  const [city, setCity] = useState("");

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("featured_listings")
      .select("*, listing:listings(name, title, city)")
      .order("created_at", { ascending: false })
      .limit(200);
    setRows((data as Row[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function act(action: string, id: string, feature?: Record<string, unknown>) {
    setBusyId(id);
    const response = await fetch("/api/admin/actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, id, feature }),
    });
    setBusyId(null);
    if (!response.ok) {
      const d = (await response.json().catch(() => ({}))) as { error?: string };
      alert(d.error || "Action failed.");
      return;
    }
    await load();
  }

  const visible = useMemo(() => {
    return rows.filter((row) => {
      if (placement !== "all" && row.placement_type !== placement) return false;
      if (status !== "all" && effectiveStatus(row) !== status) return false;
      if (payment !== "all" && row.payment_status !== payment) return false;
      if (city && !(row.city || row.listing?.city || "").toLowerCase().includes(city.toLowerCase())) return false;
      return true;
    });
  }, [rows, placement, status, payment, city]);

  const activeCount = rows.filter((r) => effectiveStatus(r) === "active").length;

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-brand text-3xl text-[#2b000a]">Featured placements</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {activeCount} currently active. Featured listings only show publicly while their listing
            is active and within the date window.
          </p>
        </div>
        <Link href={ROUTES.adminListings}>
          <Button className="rounded-full bg-[#800020] hover:bg-merlot">Feature a listing</Button>
        </Link>
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <select className={selectClass} value={placement} onChange={(e) => setPlacement(e.target.value)} aria-label="Placement">
          {PLACEMENT_FILTERS.map((p) => (
            <option key={p} value={p}>{p === "all" ? "All placements" : p.replace("_", " ")}</option>
          ))}
        </select>
        <select className={selectClass} value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
          {STATUS_FILTERS.map((s) => (
            <option key={s} value={s}>{s === "all" ? "All statuses" : s}</option>
          ))}
        </select>
        <select className={selectClass} value={payment} onChange={(e) => setPayment(e.target.value)} aria-label="Payment status">
          {PAYMENT_FILTERS.map((p) => (
            <option key={p} value={p}>{p === "all" ? "All payments" : p}</option>
          ))}
        </select>
        <input
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="Filter by city"
          className="h-9 rounded-full border bg-white px-3 text-xs outline-none"
        />
      </div>

      {loading ? (
        <DashboardTableSkeleton />
      ) : visible.length === 0 ? (
        <EmptyState
          image="https://res.cloudinary.com/dzjhuss7i/image/upload/v1781029363/empty-admin_ypowli.png"
          title="No featured placements"
          subtitle="Feature a listing from the Listings page to see it here."
          size="sm"
        />
      ) : (
        <div className="space-y-3">
          {visible.map((row) => {
            const eff = effectiveStatus(row);
            const busy = busyId === row.id;
            const canManage = eff !== "cancelled" && eff !== "expired";
            return (
              <div key={row.id} className="rounded-2xl border bg-white p-4 sm:p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${STATUS_STYLES[eff]}`}>
                        {eff}
                      </span>
                      <span className="rounded-full bg-[#fff4e5] px-2.5 py-0.5 text-xs font-semibold text-[#9a5b00]">
                        {row.placement_type.replace("_", " ")}
                      </span>
                      <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
                        {row.payment_status}
                      </span>
                    </div>
                    <h2 className="mt-2 truncate text-base font-bold text-[#202124]">
                      {row.listing?.title || row.listing?.name || "Listing removed"}
                    </h2>
                    <p className="mt-0.5 truncate text-sm text-muted-foreground">
                      {[row.city || row.listing?.city, row.category].filter(Boolean).join(" · ") || "—"} ·{" "}
                      {fmt(row.start_date)} → {fmt(row.end_date)} · priority {row.priority} ·{" "}
                      {row.currency} {Number(row.amount).toLocaleString()}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2 sm:justify-end">
                    {row.payment_status !== "paid" && (
                      <Button size="sm" variant="outline" disabled={busy} onClick={() => act("mark_feature_paid", row.id)}>
                        Mark paid
                      </Button>
                    )}
                    {row.payment_status !== "complimentary" && (
                      <Button size="sm" variant="outline" disabled={busy} onClick={() => act("mark_feature_complimentary", row.id)}>
                        Complimentary
                      </Button>
                    )}
                    {canManage && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onClick={() => {
                          const next = window.prompt("New end date (YYYY-MM-DD):", row.end_date.slice(0, 10));
                          if (next) act("extend_feature", row.id, { end_date: next });
                        }}
                      >
                        Extend
                      </Button>
                    )}
                    {canManage && (
                      <Button size="sm" variant="outline" disabled={busy} onClick={() => act("cancel_feature", row.id)}>
                        Cancel
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
