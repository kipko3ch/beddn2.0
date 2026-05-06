"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

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

export default function AdminSectionPage() {
  const params = useParams<{ section: string }>();
  const section = params.section;
  const supabase = createClient();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const table = SECTION_TABLE[section] || "bookings";
  const title = useMemo(
    () => `Admin ${section.replaceAll("-", " ")}`,
    [section]
  );

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
    ? Object.keys(rows[0]).filter((key) => !["raw_response", "payout_details"].includes(key)).slice(0, 8)
    : [];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">{title}</h1>
      {loading ? (
        <div className="h-20 bg-muted animate-pulse rounded" />
      ) : rows.length === 0 ? (
        <p className="text-muted-foreground">No records yet.</p>
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
                            Verify
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
