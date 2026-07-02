"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ROUTES } from "@/lib/routes";
import { ArrowLeft, Loader2, ShieldCheck } from "lucide-react";

type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  is_admin: boolean;
  suspended: boolean | null;
  created_at: string;
};

type Host = { id: string; name: string; phone: string; is_verified: boolean } | null;
type Listing = { id: string; name: string; city: string; is_active: boolean; is_verified: boolean };
type Booking = { id: string; guest_name: string; status: string; category: string; total_amount: number; created_at: string };

export default function AdminUserDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const supabase = useMemo(() => createClient(), []);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [host, setHost] = useState<Host>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    const { data: profileData } = await supabase
      .from("profiles")
      .select("id, email, full_name, phone, is_admin, suspended, created_at")
      .eq("id", id)
      .maybeSingle();
    setProfile((profileData as Profile) ?? null);

    const { data: hostData } = await supabase
      .from("hosts")
      .select("id, name, phone, is_verified")
      .eq("user_id", id)
      .maybeSingle();
    setHost((hostData as Host) ?? null);

    if (hostData) {
      const { data: listingData } = await supabase
        .from("listings")
        .select("id, name, city, is_active, is_verified")
        .eq("host_id", hostData.id)
        .order("created_at", { ascending: false });
      setListings((listingData as Listing[]) ?? []);
    } else {
      setListings([]);
    }

    const { data: bookingData } = await supabase
      .from("bookings")
      .select("id, guest_name, status, category, total_amount, created_at")
      .eq("user_id", id)
      .order("created_at", { ascending: false })
      .limit(20);
    setBookings((bookingData as Booking[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [id]);

  async function action(actionName: string, confirmMessage?: string) {
    if (confirmMessage && !window.confirm(confirmMessage)) return;
    setBusy(true);
    const response = await fetch("/api/admin/actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: actionName, id }),
    });
    setBusy(false);
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

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-10 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" /> Loading user…
      </div>
    );
  }

  if (!profile) {
    return (
      <div>
        <Link href={ROUTES.adminUsers} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-[#2b000a]">
          <ArrowLeft className="h-4 w-4" /> Back to users
        </Link>
        <p className="mt-6">User not found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href={ROUTES.adminUsers} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-[#2b000a]">
          <ArrowLeft className="h-4 w-4" /> Back to users
        </Link>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">{profile.full_name || profile.email}</h1>
          <p className="text-sm text-muted-foreground">{profile.email}</p>
          {profile.phone && <p className="text-sm text-muted-foreground">{profile.phone}</p>}
          <div className="mt-2 flex flex-wrap gap-1">
            {profile.is_admin && (
              <Badge className="rounded-full bg-crimson hover:bg-crimson">
                <ShieldCheck className="mr-1 h-3 w-3" /> Admin
              </Badge>
            )}
            {host && (
              <Badge variant="secondary" className="rounded-full">
                Host{host.is_verified ? " · verified" : ""}
              </Badge>
            )}
            {profile.suspended ? (
              <Badge className="rounded-full bg-red-100 text-red-700 hover:bg-red-100">Suspended</Badge>
            ) : (
              <Badge variant="secondary" className="rounded-full bg-green-100 text-green-700 hover:bg-green-100">
                Active
              </Badge>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" disabled={busy} onClick={() => action("send_signin_link")}>
            Send sign-in link
          </Button>
          {profile.suspended ? (
            <Button variant="outline" disabled={busy} onClick={() => action("unsuspend_user")}>
              Unsuspend
            </Button>
          ) : (
            <Button
              variant="outline"
              disabled={busy}
              className="text-red-700 hover:text-red-700"
              onClick={() => action("suspend_user", "Suspend this user? They will be signed out and blocked from signing in.")}
            >
              Suspend
            </Button>
          )}
          {profile.is_admin ? (
            <Button variant="outline" disabled={busy} onClick={() => action("remove_admin", "Remove admin access?")}>
              Remove admin
            </Button>
          ) : (
            <Button variant="outline" disabled={busy} onClick={() => action("make_admin", "Grant admin access?")}>
              Make admin
            </Button>
          )}
        </div>
      </div>

      {host && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Host listings ({listings.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {listings.length === 0 ? (
              <p className="text-sm text-muted-foreground">No listings yet.</p>
            ) : (
              <ul className="divide-y">
                {listings.map((l) => (
                  <li key={l.id} className="flex items-center justify-between py-2 text-sm">
                    <span>
                      {l.name} <span className="text-muted-foreground">· {l.city}</span>
                    </span>
                    <span className="flex gap-1">
                      {l.is_active && <Badge variant="secondary" className="rounded-full">Active</Badge>}
                      {l.is_verified && <Badge className="rounded-full bg-crimson hover:bg-crimson">Verified</Badge>}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent bookings ({bookings.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {bookings.length === 0 ? (
            <p className="text-sm text-muted-foreground">No bookings as a guest.</p>
          ) : (
            <ul className="divide-y">
              {bookings.map((b) => (
                <li key={b.id} className="flex items-center justify-between py-2 text-sm">
                  <span>
                    {b.category} <span className="text-muted-foreground">· {new Date(b.created_at).toLocaleDateString()}</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <Badge variant="secondary" className="rounded-full">{b.status}</Badge>
                    <span className="text-muted-foreground">{Number(b.total_amount).toLocaleString()}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
