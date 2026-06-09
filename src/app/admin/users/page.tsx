"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/empty-state";
import { ROUTES } from "@/lib/routes";
import { Loader2, ShieldCheck } from "lucide-react";

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
          <h1 className="text-2xl font-bold">Users</h1>
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
        <div className="flex items-center gap-2 py-10 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading users…
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          image="https://res.cloudinary.com/dzjhuss7i/image/upload/v1781029363/empty-admin_ypowli.png"
          title="No users found"
          subtitle="Try a different search."
          size="sm"
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="p-3 text-left font-medium">User</th>
                <th className="p-3 text-left font-medium">Roles</th>
                <th className="p-3 text-left font-medium">Status</th>
                <th className="p-3 text-left font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((u) => {
                const busy = busyId === u.id;
                const isHost = hostIds.has(u.id);
                return (
                  <tr key={u.id}>
                    <td className="p-3">
                      <Link href={ROUTES.adminUser(u.id)} className="font-medium text-[#2b000a] hover:underline">
                        {u.full_name || u.email}
                      </Link>
                      <div className="text-xs text-muted-foreground">{u.email}</div>
                      {u.phone && <div className="text-xs text-muted-foreground">{u.phone}</div>}
                    </td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1">
                        {u.is_admin && (
                          <Badge className="rounded-full bg-[#800020] hover:bg-[#800020]">
                            <ShieldCheck className="mr-1 h-3 w-3" /> Admin
                          </Badge>
                        )}
                        {isHost && (
                          <Badge variant="secondary" className="rounded-full">
                            Host
                          </Badge>
                        )}
                        {!u.is_admin && !isHost && (
                          <span className="text-xs text-muted-foreground">Guest</span>
                        )}
                      </div>
                    </td>
                    <td className="p-3">
                      {u.suspended ? (
                        <Badge className="rounded-full bg-red-100 text-red-700 hover:bg-red-100">
                          Suspended
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="rounded-full bg-green-100 text-green-700 hover:bg-green-100">
                          Active
                        </Badge>
                      )}
                    </td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-2">
                        <Link
                          href={ROUTES.adminUser(u.id)}
                          className={buttonVariants({ size: "sm", variant: "outline" })}
                        >
                          View
                        </Link>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy}
                          onClick={() => action("send_signin_link", u.id)}
                        >
                          Send sign-in link
                        </Button>
                        {u.suspended ? (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={busy}
                            onClick={() => action("unsuspend_user", u.id)}
                          >
                            Unsuspend
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={busy}
                            className="text-red-700 hover:text-red-700"
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
                          >
                            Remove admin
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={busy}
                            onClick={() => action("make_admin", u.id, `Grant admin access to ${u.email}?`)}
                          >
                            Make admin
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
