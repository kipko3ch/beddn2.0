"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/empty-state";
import { ROUTES } from "@/lib/routes";
import { ShieldCheck } from "lucide-react";
import { Icon } from "@iconify/react";
import { DashboardTableSkeleton } from "@/components/dashboard-skeletons";

type UserRow = {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  is_admin: boolean;
  suspended: boolean | null;
  created_at: string;
};

export default function AdminUsersPage() {
  const supabase = useMemo(() => createClient(), []);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [hostIds, setHostIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const [{ data: profiles }, { data: hosts }] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, email, full_name, phone, is_admin, suspended, created_at")
        .order("created_at", { ascending: false })
        .limit(500),
      supabase.from("hosts").select("user_id"),
    ]);
    setUsers((profiles as UserRow[]) ?? []);
    setHostIds(new Set((hosts ?? []).map((h: { user_id: string }) => h.user_id)));
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function action(actionName: string, id: string, confirmMessage?: string) {
    if (confirmMessage && !window.confirm(confirmMessage)) return;
    setBusyId(id);
    const response = await fetch("/api/admin/actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: actionName, id }),
    });
    setBusyId(null);
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      alert(body.error || "Action failed.");
      return;
    }
    if (actionName === "send_signin_link") {
      alert("Sign-in link sent to the user's email.");
      return;
    }
    await load();
  }

  const filtered = users.filter((u) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      u.email?.toLowerCase().includes(q) ||
      (u.full_name ?? "").toLowerCase().includes(q) ||
      (u.phone ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-brand text-3xl text-[#2b000a]">Users</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Suspend or restore accounts, send a fresh sign-in link, and manage admin access.
          </p>
        </div>
        {!loading && (
          <Badge variant="secondary" className="w-fit rounded-full">
            {users.length} users
          </Badge>
        )}
      </div>

      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by email, name, or phone"
        className="mb-4 h-11 max-w-md rounded-full px-5"
      />

      {loading ? (
        <DashboardTableSkeleton />
      ) : filtered.length === 0 ? (
        <EmptyState
          image="https://res.cloudinary.com/dzjhuss7i/image/upload/v1781029363/empty-admin_ypowli.png"
          title="No users found"
          subtitle="Try a different search."
          size="sm"
        />
      ) : (
        <div className="grid gap-3 sm:gap-4">
          {filtered.map((u) => {
            const busy = busyId === u.id;
            const isHost = hostIds.has(u.id);
            const initials = (u.full_name || u.email || "U")
              .split(" ")
              .map((w: string) => w[0])
              .join("")
              .toUpperCase()
              .slice(0, 2);

            return (
              <div
                key={u.id}
                className="group rounded-2xl border border-stone-200/90 bg-white p-4 sm:p-5 shadow-xs hover:border-[#d7a9b7] hover:shadow-md transition-all"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  {/* Left: User identity & info */}
                  <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#fbf0f3] to-[#f4dbe2] text-[#800020] font-extrabold text-sm border border-[#f3cfd9]">
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={ROUTES.adminUser(u.id)}
                          className="font-bold text-base text-[#2b000a] hover:text-[#800020] hover:underline truncate"
                        >
                          {u.full_name || u.email}
                        </Link>
                        {u.suspended ? (
                          <Badge className="rounded-full bg-red-100 text-red-700 hover:bg-red-100 text-[10px] font-bold border-0">
                            Suspended
                          </Badge>
                        ) : (
                          <Badge className="rounded-full bg-emerald-50 text-emerald-700 hover:bg-emerald-50 text-[10px] font-bold border border-emerald-200">
                            Active
                          </Badge>
                        )}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Icon icon="solar:letter-linear" className="size-3.5 text-stone-400" />
                          {u.email}
                        </span>
                        {u.phone && (
                          <span className="flex items-center gap-1">
                            <Icon icon="solar:phone-linear" className="size-3.5 text-stone-400" />
                            {u.phone}
                          </span>
                        )}
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        {u.is_admin && (
                          <Badge className="rounded-full bg-[#800020] text-white hover:bg-[#800020] text-[10px] font-bold px-2 py-0.5">
                            <ShieldCheck className="mr-1 h-3 w-3" /> Admin
                          </Badge>
                        )}
                        {isHost && (
                          <Badge className="rounded-full bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-bold px-2 py-0.5">
                            Host
                          </Badge>
                        )}
                        {!u.is_admin && !isHost && (
                          <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-semibold text-stone-600">
                            Guest
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex flex-wrap items-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-stone-100">
                    <Link
                      href={ROUTES.adminUser(u.id)}
                      className={buttonVariants({ size: "sm", variant: "outline", className: "h-8 rounded-full px-3 text-xs font-semibold" })}
                    >
                      View
                    </Link>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={() => action("send_signin_link", u.id)}
                      className="h-8 rounded-full px-3 text-xs font-semibold"
                    >
                      Sign-in link
                    </Button>
                    {u.suspended ? (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onClick={() => action("unsuspend_user", u.id)}
                        className="h-8 rounded-full px-3 text-xs font-semibold text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                      >
                        Unsuspend
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        className="h-8 rounded-full px-3 text-xs font-semibold text-red-700 border-red-200 hover:bg-red-50"
                        onClick={() =>
                          action("suspend_user", u.id, `Suspend ${u.email}? They will be signed out and blocked from signing in.`)
                        }
                      >
                        Suspend
                      </Button>
                    )}
                    {u.is_admin ? (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onClick={() =>
                          action("remove_admin", u.id, `Remove admin access from ${u.email}?`)
                        }
                        className="h-8 rounded-full px-3 text-xs font-semibold"
                      >
                        Remove admin
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onClick={() => action("make_admin", u.id, `Grant admin access to ${u.email}?`)}
                        className="h-8 rounded-full px-3 text-xs font-semibold text-[#800020] border-[#f3cfd9] hover:bg-[#fbf0f3]"
                      >
                        Make admin
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
