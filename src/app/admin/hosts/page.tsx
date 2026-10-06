"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DashboardListSkeleton } from "@/components/dashboard-skeletons";
import { BadgeCheck, Check, KeyRound, Loader2, Pause, Play, ShieldCheck, X } from "lucide-react";

type HostRow = {
  id: string;
  user_id: string;
  name: string | null;
  phone: string | null;
  status: string | null;
  is_verified: boolean | null;
  verification_status: string | null;
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

const VERIFICATION_BADGE: Record<string, string> = {
  not_started: "bg-zinc-100 text-zinc-800 hover:bg-zinc-100 border-zinc-200",
  under_review: "bg-amber-50 text-amber-700 hover:bg-amber-50 border-amber-200 animate-pulse",
  verified: "bg-emerald-50 text-emerald-800 hover:bg-emerald-50 border-emerald-200",
};

export default function AdminHostsPage() {
  const supabase = useMemo(() => createClient(), []);
  const [hosts, setHosts] = useState<HostRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    const { data } = await supabase
      .from("hosts")
      .select("id, user_id, name, phone, status, is_verified, verification_status, national_id, applied_at, created_at")
      .order("created_at", { ascending: false })
      .limit(300);
    setHosts((data as HostRow[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function act(host: HostRow, action: string, reason?: string) {
    // The PIN lives on profiles (user_id), everything else on hosts (id).
    const targetId = action === "reset_host_pin" ? host.user_id : host.id;
    setBusyId(host.id);
    const res = await fetch("/api/admin/actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, id: targetId, reason }),
    });
    setBusyId(null);
    if (!res.ok) {
      alert("Action failed. Please try again.");
      return;
    }
    await load();
  }

  function Row({ host }: { host: HostRow }) {
    const status = host.status ?? "approved";
    const vStatus = host.verification_status || (host.is_verified ? "verified" : "not_started");
    const busy = busyId === host.id;
    const initials = (host.name || "H")
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();

    return (
      <div className="rounded-2xl border border-stone-200/90 bg-white p-4 sm:p-5 shadow-xs hover:border-[#f3cfd9] hover:shadow-sm transition">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start gap-3.5 min-w-0">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#800020] to-[#590016] text-white font-bold text-sm shadow-xs">
              {initials}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-bold text-[#2b000a] text-base">{host.name || "Unnamed host"}</p>
                <Badge className={`text-xs capitalize ${STATUS_BADGE[status] ?? "bg-muted"}`}>{status}</Badge>
                <Badge className={`text-xs capitalize gap-1 ${VERIFICATION_BADGE[vStatus] ?? "bg-zinc-100"}`}>
                  {vStatus === "verified" && <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />}
                  {vStatus === "under_review" ? "Under Review" : vStatus === "verified" ? "Verified" : "Not Verified"}
                </Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground flex flex-wrap items-center gap-2">
                <span>{host.phone || "No phone recorded"}</span>
                {host.national_id && (
                  <>
                    <span>·</span>
                    <span className="font-mono bg-stone-100 px-2 py-0.5 rounded-md text-stone-700">
                      ID: {host.national_id}
                    </span>
                  </>
                )}
                {host.created_at && (
                  <>
                    <span>·</span>
                    <span>Joined {new Date(host.created_at).toLocaleDateString()}</span>
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-2 sm:pt-0 border-t border-stone-100 sm:border-0">
            {busy && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            
            {/* Toggle Verification Badge */}
            {host.is_verified ? (
              <Button
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => act(host, "unverify_host")}
                className="gap-1 rounded-full text-red-700 hover:bg-red-50 hover:text-red-800 text-xs h-8"
              >
                <X className="h-3.5 w-3.5" /> Remove Badge
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => act(host, "verify_host")}
                className="gap-1 rounded-full text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 text-xs h-8"
              >
                <ShieldCheck className="h-3.5 w-3.5" /> Verify Host
              </Button>
            )}

            {/* Suspend / Reinstate */}
            {status === "approved" ? (
              <Button size="sm" variant="outline" disabled={busy} onClick={() => act(host, "suspend_host")} className="gap-1 rounded-full text-xs h-8">
                <Pause className="h-3.5 w-3.5" /> Suspend
              </Button>
            ) : (
              <Button size="sm" disabled={busy} onClick={() => act(host, "approve_host")} className="gap-1 rounded-full bg-[#128c4b] hover:bg-[#0f7a41] text-xs h-8">
                <Play className="h-3.5 w-3.5" /> Reinstate
              </Button>
            )}

            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => {
                if (!confirm(`Reset ${host.name || "this host"}'s Extranet PIN? They'll set a new one next time they open /host.`)) return;
                act(host, "reset_host_pin");
              }}
              className="gap-1 rounded-full text-xs h-8"
            >
              <KeyRound className="h-3.5 w-3.5" /> Reset PIN
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-brand text-3xl text-[#2b000a]">Hosts</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Verify host identity or credentials. Once verified, hosts receive a badge on their profiles and listings.
        </p>
      </div>

      {loading ? (
        <DashboardListSkeleton rows={5} />
      ) : (
        <div className="space-y-6">
          <section>
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-[#a08b92]">All hosts ({hosts.length})</h2>
            {hosts.length === 0 ? (
              <div className="rounded-2xl border bg-white p-8 text-center text-sm text-muted-foreground">
                No hosts registered yet.
              </div>
            ) : (
              <div className="space-y-3">
                {hosts.map((host) => <Row key={host.id} host={host} />)}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
