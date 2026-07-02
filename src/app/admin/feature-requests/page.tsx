"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DashboardListSkeleton } from "@/components/dashboard-skeletons";

type Req = {
  id: string;
  title: string;
  detail: string | null;
  status: string;
  created_at: string;
};

const STATUSES = ["new", "planned", "shipped", "declined"] as const;

const STATUS_BADGE: Record<string, string> = {
  new: "bg-amber-100 text-amber-800 hover:bg-amber-100",
  planned: "bg-blue-100 text-blue-800 hover:bg-blue-100",
  shipped: "bg-green-100 text-green-800 hover:bg-green-100",
  declined: "bg-zinc-200 text-zinc-600 hover:bg-zinc-200",
};

export default function AdminFeatureRequestsPage() {
  const supabase = useMemo(() => createClient(), []);
  const [requests, setRequests] = useState<Req[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    const { data } = await supabase
      .from("feature_requests")
      .select("id, title, detail, status, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    setRequests((data as Req[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function setStatus(id: string, status: string) {
    setBusyId(id);
    setRequests((cur) => cur.map((r) => (r.id === id ? { ...r, status } : r)));
    const res = await fetch("/api/admin/actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "set_feature_status", id, reason: status }),
    });
    setBusyId(null);
    if (!res.ok) {
      alert("Could not update.");
      await load();
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-brand text-3xl text-[#2b000a]">Feature requests</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Ideas hosts have submitted. Triage them so hosts see progress.
        </p>
      </div>

      {loading ? (
        <DashboardListSkeleton rows={5} />
      ) : requests.length === 0 ? (
        <p className="rounded-2xl border bg-white p-4 text-sm text-muted-foreground">
          No feature requests yet.
        </p>
      ) : (
        <div className="space-y-3">
          {requests.map((r) => (
            <div key={r.id} className="rounded-2xl border bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-[#2b000a]">{r.title}</p>
                  {r.detail && <p className="mt-1 text-sm text-muted-foreground">{r.detail}</p>}
                </div>
                <Badge className={`text-xs capitalize ${STATUS_BADGE[r.status] ?? "bg-muted"}`}>
                  {r.status}
                </Badge>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {STATUSES.map((s) => (
                  <Button
                    key={s}
                    size="sm"
                    variant={r.status === s ? "default" : "outline"}
                    disabled={busyId === r.id || r.status === s}
                    onClick={() => setStatus(r.id, s)}
                    className={`rounded-full capitalize ${r.status === s ? "bg-[#800020] hover:bg-merlot" : ""}`}
                  >
                    {s}
                  </Button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
