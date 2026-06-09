"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ROUTES } from "@/lib/routes";
import {
  AlertTriangle,
  CalendarCheck,
  CheckCircle2,
  CreditCard,
  Home,
  MessageSquare,
  ShieldCheck,
  TrendingUp,
  Wallet,
} from "lucide-react";

type Stat = {
  label: string;
  value: string | number;
  icon: React.ElementType;
  href: string;
  tone?: "brand" | "warning" | "muted";
};

type HostStatus = {
  id: string;
  is_verified: boolean;
} | null;

export default function DashboardPage() {
  const supabase = useMemo(() => createClient(), []);
  const [isAdmin, setIsAdmin] = useState(false);
  const [host, setHost] = useState<HostStatus>(null);
  const [userEmail, setUserEmail] = useState("");
  const [stats, setStats] = useState<Stat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        setLoading(false);
        return;
      }
      setUserEmail(user.user.email ?? "");

      const { data: profile } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", user.user.id)
        .single();

      const admin = profile?.is_admin ?? false;
      setIsAdmin(admin);

      if (admin) {
        const [
          pendingHosts,
          pendingListings,
          paidBookings,
          disputes,
          withdrawals,
          feedback,
          demand,
          payments,
        ] = await Promise.all([
          supabase.from("hosts").select("id", { count: "exact", head: true }).eq("is_verified", false),
          supabase
            .from("listings")
            .select("id", { count: "exact", head: true })
            .or("is_verified.eq.false,verification_status.eq.pending"),
          supabase
            .from("bookings")
            .select("id", { count: "exact", head: true })
            .in("status", ["paid_pending_host", "confirmed"]),
          supabase
            .from("bookings")
            .select("id", { count: "exact", head: true })
            .in("status", ["disputed", "rejected"]),
          supabase
            .from("withdrawals")
            .select("id", { count: "exact", head: true })
            .eq("status", "requested"),
          supabase.from("feedback").select("id", { count: "exact", head: true }),
          supabase.from("search_demand").select("id", { count: "exact", head: true }),
          supabase
            .from("payments")
            .select("id", { count: "exact", head: true })
            .eq("status", "initialized"),
        ]);

        setStats([
          { label: "Host badges pending", value: pendingHosts.count ?? 0, icon: ShieldCheck, href: ROUTES.adminHosts, tone: "warning" },
          { label: "Listing badges pending", value: pendingListings.count ?? 0, icon: Home, href: ROUTES.adminListings, tone: "warning" },
          { label: "Active paid bookings", value: paidBookings.count ?? 0, icon: CalendarCheck, href: ROUTES.adminBookings, tone: "brand" },
          { label: "Disputes / rejected", value: disputes.count ?? 0, icon: AlertTriangle, href: ROUTES.adminDisputes, tone: "warning" },
          { label: "Withdrawal requests", value: withdrawals.count ?? 0, icon: Wallet, href: ROUTES.adminWithdrawals, tone: "brand" },
          { label: "Feedback items", value: feedback.count ?? 0, icon: MessageSquare, href: ROUTES.adminFeedback },
          { label: "Demand searches", value: demand.count ?? 0, icon: TrendingUp, href: ROUTES.adminDemand },
          { label: "Open payments", value: payments.count ?? 0, icon: CreditCard, href: ROUTES.adminPayments },
        ]);
        setLoading(false);
        return;
      }

      const { data: hostData } = await supabase
        .from("hosts")
        .select("id, is_verified")
        .eq("user_id", user.user.id)
        .maybeSingle();

      setHost((hostData as HostStatus) ?? null);
      if (!hostData) {
        setStats([]);
        setLoading(false);
        return;
      }

      const { data: listingRows } = await supabase
        .from("listings")
        .select("id, is_active, listing_status")
        .eq("host_id", hostData.id);
      const listingIds = (listingRows ?? []).map((listing: { id: string }) => listing.id);
      const activeListings = (listingRows ?? []).filter(
        (listing: { is_active?: boolean; listing_status?: string | null }) =>
          listing.is_active || listing.listing_status === "active"
      ).length;

      const [
        requests,
        confirmed,
        completed,
        heldBalance,
        withdrawableBalance,
      ] = await Promise.all([
        listingIds.length
          ? supabase.from("bookings").select("id", { count: "exact", head: true }).in("listing_id", listingIds).eq("status", "paid_pending_host")
          : Promise.resolve({ count: 0 }),
        listingIds.length
          ? supabase.from("bookings").select("id", { count: "exact", head: true }).in("listing_id", listingIds).eq("status", "confirmed")
          : Promise.resolve({ count: 0 }),
        listingIds.length
          ? supabase.from("bookings").select("id", { count: "exact", head: true }).in("listing_id", listingIds).eq("status", "completed")
          : Promise.resolve({ count: 0 }),
        supabase.from("host_balances").select("amount").eq("host_id", hostData.id).eq("status", "held"),
        supabase.from("host_balances").select("amount").eq("host_id", hostData.id).eq("status", "withdrawable"),
      ]);

      const held = (heldBalance.data ?? []).reduce((sum: number, row: { amount: number }) => sum + Number(row.amount || 0), 0);
      const withdrawable = (withdrawableBalance.data ?? []).reduce((sum: number, row: { amount: number }) => sum + Number(row.amount || 0), 0);

      setStats([
        { label: "Total listings", value: listingIds.length, icon: Home, href: ROUTES.dashboardListings },
        { label: "Active listings", value: activeListings, icon: CheckCircle2, href: ROUTES.dashboardListings, tone: "brand" },
        { label: "New paid requests", value: requests.count ?? 0, icon: CalendarCheck, href: ROUTES.dashboardBookings, tone: "warning" },
        { label: "Confirmed bookings", value: confirmed.count ?? 0, icon: CheckCircle2, href: ROUTES.dashboardBookings, tone: "brand" },
        { label: "Completed stays", value: completed.count ?? 0, icon: ShieldCheck, href: ROUTES.dashboardBookings },
        { label: "Held balance", value: `KES ${held.toLocaleString()}`, icon: Wallet, href: ROUTES.dashboardWithdrawals },
        { label: "Withdrawable", value: `KES ${withdrawable.toLocaleString()}`, icon: CreditCard, href: ROUTES.dashboardWithdrawals, tone: "brand" },
      ]);
      setLoading(false);
    }
    load();
  }, [supabase]);

  const badge = isAdmin
    ? "Admin workspace"
    : host?.is_verified
    ? "Verified host"
    : host
    ? "Verification badge pending"
    : "Guest account";

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Badge className="mb-3 rounded-full bg-[#f8eef2] text-[#800020] hover:bg-[#f8eef2]">
            {badge}
          </Badge>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isAdmin
              ? "Monitor verification badges, payments, disputes, withdrawals, feedback, and demand."
              : host
              ? "Manage listings, booking requests, availability, payouts, and guest feedback."
              : "Create a host profile to list hourly stays, overnight stays, or experiences."}
          </p>
        </div>
        {!isAdmin && (
          <Link
            href={ROUTES.newListing}
            className="inline-flex h-10 items-center justify-center rounded-full bg-[#800020] px-5 text-sm font-bold text-white hover:bg-[#600018]"
          >
            {host ? "Create listing" : "Apply as host"}
          </Link>
        )}
      </div>

      {loading ? null : stats.length === 0 ? (
        <div className="rounded-2xl border bg-[#fbf7f8] p-6">
          <Image
            src="https://res.cloudinary.com/dzjhuss7i/image/upload/v1781029370/empty-host-needed_vum5fe.png"
            alt=""
            width={160}
            height={130}
            className="mb-4 h-auto w-[150px]"
            aria-hidden
          />
          <h2 className="text-lg font-bold">Host account needed</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            This signed-in account{userEmail ? ` (${userEmail})` : ""} is not linked to a host profile yet.
            Create one and start listing right away.
          </p>
          <Link
            href={ROUTES.newListing}
            className="mt-5 inline-flex h-10 items-center rounded-full bg-[#800020] px-5 text-sm font-bold text-white"
          >
            Create host profile
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {host && !host.is_verified && !isAdmin && (
            <div className="flex flex-col gap-4 rounded-2xl border bg-white p-5 shadow-sm sm:flex-row sm:items-center">
              <Image
                src="https://res.cloudinary.com/dzjhuss7i/image/upload/v1781029380/spot-verified_anp2nf.png"
                alt=""
                width={110}
                height={90}
                className="h-auto w-[96px]"
                aria-hidden
              />
              <div>
                <h2 className="text-lg font-bold text-[#2b000a]">Verification badge pending</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Your listings can be active now. Admin review only adds the Beddn verified badge when checks pass.
                </p>
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {stats.map(({ label, value, icon: Icon, href, tone }) => (
              <Link key={label} href={href}>
                <Card className="h-full transition-shadow hover:shadow-sm">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {label}
                    </CardTitle>
                    <Icon
                      className={`h-4 w-4 ${
                        tone === "brand"
                          ? "text-[#800020]"
                          : tone === "warning"
                          ? "text-amber-700"
                          : "text-muted-foreground"
                      }`}
                    />
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{value}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
