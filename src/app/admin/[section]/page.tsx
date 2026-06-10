"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/empty-state";
import { BeddnLoader } from "@/components/beddn-loader";

type Row = Record<string, unknown> & { id: string };

const SECTION_TABLE: Record<string, string> = {
  bookings: "bookings",
  payments: "payments",
  hosts: "hosts",
  listings: "listings",
  withdrawals: "withdrawals",
  disputes: "bookings",
  feedback: "feedback",
  demand: "search_demand",
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
  demand: ["query", "category", "results_count", "created_at"],
};

const SECTION_TITLE: Record<string, string> = {
  bookings: "Bookings",
  payments: "Payments",
  hosts: "Hosts",
  listings: "Listings",
  withdrawals: "Withdrawals",
  disputes: "Disputes",
  feedback: "Feedback",
  demand: "Search demand",
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
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Review the latest 100 records and manage verification, payouts, and manual actions.
          </p>
        </div>
        {!loading && (
          <div className="flex gap-2">
            <Badge variant="secondary" className="rounded-full">{rows.length} total</Badge>
            <Badge className="rounded-full bg-[#f8eef2] text-[#800020] hover:bg-[#f8eef2]">
              {urgentCount} need review
            </Badge>
          </div>
        )}
      </div>
      {loading ? (
        <BeddnLoader label={`Loading ${title.toLowerCase()}…`} />
      ) : rows.length === 0 ? (
        <EmptyState
          image="https://res.cloudinary.com/dzjhuss7i/image/upload/v1781029363/empty-admin_ypowli.png"
          title="No records yet"
          subtitle="Records for this section will appear here."
          size="sm"
        />
      ) : (
        <div className="border rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                {visibleKeys.map((key) => (
                  <th key={key} className="text-left p-3 font-medium">
                    {key}
                  </th>
                ))}
                <th className="text-left p-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((row) => (
                <tr key={row.id}>
                  {visibleKeys.map((key) => (
                    <td key={key} className="p-3 max-w-48 truncate">
                      {label(row[key])}
                    </td>
                  ))}
                  <td className="p-3">
                    <div className="flex flex-wrap gap-2">
                      {section === "hosts" && (
                        <Button size="sm" variant="outline" onClick={() => action("verify_host", row.id)}>
                          Verify
                        </Button>
                      )}
                      {section === "listings" && (
                        <>
                          <Button size="sm" variant="outline" onClick={() => action("verify_listing", row.id)}>
                            Verify badge
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => action("reject_listing", row.id)}>
                            Reject
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => action("pause_listing", row.id)}>
                            Pause
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => action("enable_auto_accept", row.id)}>
                            Auto accept
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => action("disable_auto_accept", row.id)}>
                            Manual
                          </Button>
                        </>
                      )}
                      {section === "withdrawals" && (
                        <>
                          <Button size="sm" variant="outline" onClick={() => action("approve_withdrawal", row.id)}>
                            Approve
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => action("mark_withdrawal_paid", row.id)}>
                            Paid
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => action("reject_withdrawal", row.id)}>
                            Reject
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
