"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/empty-state";
import { DashboardTableSkeleton } from "@/components/dashboard-skeletons";

type Row = Record<string, unknown> & { id: string };

const SECTION_TABLE: Record<string, string> = {
  bookings: "bookings",
  payments: "payments",
  hosts: "hosts",
  listings: "listings",
  withdrawals: "withdrawals",
  disputes: "bookings",
  feedback: "feedback",
  reviews: "reviews",
  demand: "search_demand",
  notifications: "notification_logs",
  inquiries: "inquiries",
  events: "listing_events",
};

function label(value: unknown) {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

const SECTION_COLUMNS: Record<string, string[]> = {
  bookings: ["guest_name", "status", "category", "currency", "deposit_amount", "created_at"],
  payments: ["provider", "status", "currency", "amount", "provider_reference", "created_at"],
  hosts: ["name", "phone", "is_verified", "created_at"],
  listings: ["name", "city", "area", "is_active", "is_verified", "verification_status", "booking_mode"],
  withdrawals: ["amount", "currency", "status", "payout_method", "created_at"],
  disputes: ["guest_name", "status", "booking_token", "created_at"],
  feedback: ["rating", "issue_reported", "issue_type", "comment", "created_at"],
  reviews: ["rating", "comment", "tags", "created_at"],
  demand: ["query", "category", "results_count", "created_at"],
  notifications: ["event_type", "recipient", "message", "status", "created_at"],
  inquiries: ["guest_name", "guest_whatsapp", "category", "check_in", "guests_count", "availability_status", "status", "source", "created_at"],
  events: ["event_type", "listing_id", "session_id", "created_at"],
};

const SECTION_TITLE: Record<string, string> = {
  bookings: "Bookings",
  payments: "Payments",
  hosts: "Hosts",
  listings: "Listings",
  withdrawals: "Withdrawals",
  disputes: "Disputes",
  feedback: "Feedback",
  reviews: "Reviews",
  demand: "Search demand",
  notifications: "Notifications",
  inquiries: "Inquiries",
  events: "Analytics events",
};

export default function AdminSectionPage() {
  const params = useParams<{ section: string }>();
  const section = params.section;
  const supabase = createClient();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const table = SECTION_TABLE[section] || "bookings";
  const title = useMemo(() => SECTION_TITLE[section] ?? section, [section]);

  async function load() {
    setLoading(true);
    let query = supabase.from(table).select("*").order("created_at", { ascending: false }).limit(100);
    if (section === "disputes") {
      query = query.in("status", ["disputed", "rejected", "refunded"]);
    }
    const { data } = await query;
    setRows((data as Row[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [section]);

  async function action(actionName: string, id: string) {
    const response = await fetch("/api/admin/actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: actionName, id }),
    });
    if (!response.ok) {
      alert("Admin action failed.");
      return;
    }
    await load();
  }

  const visibleKeys = rows[0]
    ? SECTION_COLUMNS[section] ??
      Object.keys(rows[0]).filter((key) => !["raw_response", "payout_details"].includes(key)).slice(0, 8)
    : [];

  const urgentCount = rows.filter((row) =>
    ["pending", "requested", "disputed", "rejected", "paid_pending_host"].includes(String(row.status ?? row.verification_status ?? ""))
    || row.is_verified === false
    || row.issue_reported === true
  ).length;

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-brand text-3xl text-[#2b000a]">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Review the latest 100 records and manage verification, payouts, and manual actions.
          </p>
        </div>
        {!loading && (
          <div className="flex gap-2">
            <Badge variant="secondary" className="rounded-full">{rows.length} total</Badge>
            <Badge className="rounded-full bg-cream/60 text-crimson hover:bg-cream/60">
              {urgentCount} need review
            </Badge>
          </div>
        )}
      </div>
      {loading ? (
        <DashboardTableSkeleton />
      ) : rows.length === 0 ? (
        <EmptyState
          image="https://res.cloudinary.com/dzjhuss7i/image/upload/v1781029363/empty-admin_ypowli.png"
          title="No records yet"
          subtitle="Records for this section will appear here."
          size="sm"
        />
      ) : (
        <div className="grid gap-3 sm:gap-4">
          {rows.map((row) => (
            <div
              key={row.id}
              className="rounded-2xl border border-stone-200/90 bg-white p-4 sm:p-5 shadow-xs hover:border-[#d7a9b7] transition-all"
            >
              <div className="flex flex-col gap-3">
                {/* Header row */}
                <div className="flex items-center justify-between border-b border-stone-100 pb-2.5">
                  <span className="font-mono text-xs font-bold text-[#800020]">
                    ID: {String(row.id).slice(0, 8)}
                  </span>
                  {typeof row.created_at === "string" && (
                    <span className="text-[11px] text-muted-foreground font-mono">
                      {new Date(row.created_at).toLocaleDateString()}
                    </span>
                  )}
                </div>

                {/* Key value grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 py-1 text-xs">
                  {visibleKeys.map((key) => (
                    <div key={key} className="min-w-0">
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-stone-400 truncate">
                        {key.replace(/_/g, " ")}
                      </span>
                      <span className="mt-0.5 block font-semibold text-stone-800 break-words">
                        {label(row[key])}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Actions row */}
                <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-stone-100">
                  {section === "bookings" && (
                    <>
                      <Button size="sm" variant="outline" className="border-green-200 text-green-700 hover:bg-green-50 h-8 rounded-full text-xs font-semibold" onClick={() => action("confirm_booking", row.id)}>
                        Confirm
                      </Button>
                      <Button size="sm" variant="outline" className="border-red-200 text-red-700 hover:bg-red-50 h-8 rounded-full text-xs font-semibold" onClick={() => action("reject_booking", row.id)}>
                        Reject
                      </Button>
                      <Button size="sm" variant="outline" className="border-gray-200 text-gray-700 hover:bg-gray-100 h-8 rounded-full text-xs font-semibold" onClick={() => action("revoke_booking", row.id)}>
                        Revoke
                      </Button>
                    </>
                  )}
                  {section === "hosts" && (
                    <Button size="sm" variant="outline" className="h-8 rounded-full text-xs font-semibold text-[#800020] border-[#f3cfd9] hover:bg-[#fbf0f3]" onClick={() => action("verify_host", row.id)}>
                      Verify
                    </Button>
                  )}
                  {section === "withdrawals" && (
                    <>
                      <Button size="sm" variant="outline" className="h-8 rounded-full text-xs font-semibold" onClick={() => action("approve_withdrawal", row.id)}>
                        Approve
                      </Button>
                      <Button size="sm" variant="outline" className="h-8 rounded-full text-xs font-semibold text-green-700 border-green-200 hover:bg-green-50" onClick={() => action("mark_withdrawal_paid", row.id)}>
                        Paid
                      </Button>
                      <Button size="sm" variant="outline" className="h-8 rounded-full text-xs font-semibold text-red-700 border-red-200 hover:bg-red-50" onClick={() => action("reject_withdrawal", row.id)}>
                        Reject
                      </Button>
                    </>
                  )}
                  {section === "reviews" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-red-200 text-red-700 hover:bg-red-50 h-8 rounded-full text-xs font-semibold"
                      onClick={() => {
                        if (window.confirm("Are you sure you want to delete this review?")) {
                          action("delete_review", row.id);
                        }
                      }}
                    >
                      Delete
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
