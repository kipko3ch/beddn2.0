"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DashboardListSkeleton } from "@/components/dashboard-skeletons";
import { BadgeCheck, Check, Loader2, Pause, Play, ShieldCheck, X } from "lucide-react";

type HostRow = {
  id: string;
  name: string | null;
  phone: string | null;
  status: string | null;
  is_verified: boolean | null;
  national_id: string | null;
  applied_at: string | null;
  created_at: string | null;
};

const STATUS_BADGE: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 hover:bg-amber-100",
  approved: "bg-green-100 text-green-800 hover:bg-green-100",
  rejected: "bg-red-100 text-red-800 hover:bg-red-100",
  suspended: "bg-zinc-200 text-zinc-700 hover:bg-zinc-200",
};

export default function AdminHostsPage() {
  const supabase = useMemo(() => createClient(), []);
  const [hosts, setHosts] = useState<HostRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    const { data } = await supabase
      .from("hosts")
      .select("id, name, phone, status, is_verified, national_id, applied_at, created_at")
      .order("created_at", { ascending: false })
      .limit(300);
    setHosts((data as HostRow[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function act(id: string, action: string, reason?: string) {
    setBusyId(id);
    const res = await fetch("/api/admin/actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, id, reason }),
    });
    setBusyId(null);
    if (!res.ok) {
      alert("Action failed. Please try again.");
      return;
    }
    await load();
  }

  const pending = hosts.filter((h) => (h.status ?? "approved") === "pending");
  const others = hosts.filter((h) => (h.status ?? "approved") !== "pending");

  function Row({ host }: { host: HostRow }) {
    const status = host.status ?? "approved";
    const busy = busyId === host.id;
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-[#2b000a]">{host.name || "Unnamed host"}</p>
            <Badge className={`text-xs capitalize ${STATUS_BADGE[status] ?? "bg-muted"}`}>{status}</Badge>
            {host.is_verified && (
              <Badge className="gap-1 bg-[#f8eef2] text-xs text-[#800020] hover:bg-[#f8eef2]">
                <BadgeCheck className="h-3 w-3" /> Verified
              </Badge>
            )}
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {host.phone || "No phone"}
            {host.national_id ? ` · ID: ${host.national_id}` : ""}
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          {busy && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          {status === "pending" && (
            <>
              <Button
                size="sm"
                disabled={busy}
                onClick={() => act(host.id, "approve_host")}
                className="gap-1 rounded-full bg-[#128c4b] hover:bg-[#0f7a41]"
              >
                <Check className="h-4 w-4" /> Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => {
                  const reason = prompt("Reason for rejection (optional):") ?? undefined;
                  act(host.id, "reject_host", reason);
                }}
                className="gap-1 rounded-full"
              >
                <X className="h-4 w-4" /> Reject
              </Button>
            </>
          )}
          {status === "approved" && (
            <>
              {!host.is_verified && (
                <Button size="sm" variant="outline" disabled={busy} onClick={() => act(host.id, "verify_host")} className="gap-1 rounded-full">
                  <ShieldCheck className="h-4 w-4" /> Give badge
                </Button>
              )}
              <Button size="sm" variant="outline" disabled={busy} onClick={() => act(host.id, "suspend_host")} className="gap-1 rounded-full">
                <Pause className="h-4 w-4" /> Suspend
              </Button>
            </>
          )}
          {(status === "suspended" || status === "rejected") && (
            <Button size="sm" disabled={busy} onClick={() => act(host.id, "approve_host")} className="gap-1 rounded-full bg-[#128c4b] hover:bg-[#0f7a41]">
              <Play className="h-4 w-4" /> Reinstate
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-brand text-3xl text-[#2b000a]">Hosts</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Approve new hosts once — approved hosts then manage their own listings and bookings.
        </p>
      </div>

      {loading ? (
        <DashboardListSkeleton rows={5} />
      ) : (
        <div className="space-y-6">
          <section>
            <h2 className="mb-2 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-[#a08b92]">
              Awaiting approval
              {pending.length > 0 && (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">
                  {pending.length}
                </span>
              )}
            </h2>
            <div className="divide-y rounded-2xl border bg-white">
              {pending.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">No hosts waiting for approval. 🎉</p>
              ) : (
                pending.map((host) => <Row key={host.id} host={host} />)
              )}
            </div>
          </section>

          <section>
            <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-[#a08b92]">All hosts</h2>
            <div className="divide-y rounded-2xl border bg-white">
              {others.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">No hosts yet.</p>
              ) : (
                others.map((host) => <Row key={host.id} host={host} />)
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
