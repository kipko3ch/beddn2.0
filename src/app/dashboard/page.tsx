"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import { BeddnLoader } from "@/components/beddn-loader";
import { ROUTES } from "@/lib/routes";
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  CalendarCheck,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  Home,
  MessageSquare,
  Plus,
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
  name?: string | null;
  is_verified: boolean;
} | null;

const QUICK_ACTIONS = [
  { label: "Create listing", description: "Add a new place or experience", href: ROUTES.newListing, icon: Plus },
  { label: "Bookings", description: "Accept or review requests", href: ROUTES.dashboardBookings, icon: CalendarCheck },
  { label: "Calendar", description: "Block dates and sync iCal", href: ROUTES.dashboardCalendar, icon: CalendarDays },
  { label: "Feedback", description: "See what guests said", href: ROUTES.dashboardFeedback, icon: MessageSquare },
];

function StatCard({ label, value, icon: Icon, href, tone }: Stat) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border bg-white p-4 transition-shadow hover:shadow-md sm:p-5"
    >
      <div className="flex items-start justify-between">
        <span
          className={`flex size-10 items-center justify-center rounded-xl ${
            tone === "brand"
              ? "bg-[#f8eef2] text-[#800020]"
              : tone === "warning"
              ? "bg-amber-50 text-amber-700"
              : "bg-[#f5f1f2] text-[#6f6568]"
          }`}
        >
          <Icon className="h-5 w-5" />
        </span>
        <ArrowUpRight className="h-4 w-4 text-[#d8c8cd] transition-colors group-hover:text-[#800020]" />
      </div>
      <p className="mt-4 text-2xl font-bold text-[#2b000a]">{value}</p>
      <p className="mt-0.5 text-sm text-muted-foreground">{label}</p>
    </Link>
  );
}

export default function DashboardPage() {
  const supabase = useMemo(() => createClient(), []);
  const [isAdmin, setIsAdmin] = useState(false);
  const [host, setHost] = useState<HostStatus>(null);
  const [userEmail, setUserEmail] = useState("");
  const [stats, setStats] = useState<Stat[]>([]);
  const [money, setMoney] = useState<{ held: number; withdrawable: number } | null>(null);
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
        .select("id, name, is_verified")
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

      setMoney({ held, withdrawable });
      setStats([
        { label: "Total listings", value: listingIds.length, icon: Home, href: ROUTES.dashboardListings },
        { label: "Active listings", value: activeListings, icon: CheckCircle2, href: ROUTES.dashboardListings, tone: "brand" },
        { label: "New paid requests", value: requests.count ?? 0, icon: CalendarCheck, href: ROUTES.dashboardBookings, tone: "warning" },
        { label: "Confirmed bookings", value: confirmed.count ?? 0, icon: CheckCircle2, href: ROUTES.dashboardBookings, tone: "brand" },
        { label: "Completed stays", value: completed.count ?? 0, icon: ShieldCheck, href: ROUTES.dashboardBookings },
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

  const greetingName = host?.name?.split(" ")[0] || userEmail.split("@")[0] || "there";
  const pendingRequests = Number(
    stats.find((stat) => stat.label === "New paid requests")?.value ?? 0
  );

  if (loading) {
    return <BeddnLoader label="Loading your dashboard…" />;
  }

  // No host profile yet — invite them to create one.
  if (!isAdmin && !host) {
    return (
      <div className="overflow-hidden rounded-3xl border bg-white">
        <div className="grid items-center gap-6 p-6 sm:grid-cols-[1fr_auto] sm:p-10">
          <div>
            <Badge className="mb-4 rounded-full bg-[#f8eef2] text-[#800020] hover:bg-[#f8eef2]">
              {badge}
            </Badge>
            <h1 className="font-brand text-3xl text-[#2b000a] sm:text-4xl">Become a Beddn host</h1>
            <p className="mt-3 max-w-md text-sm text-muted-foreground">
              This account{userEmail ? ` (${userEmail})` : ""} isn&apos;t linked to a host profile yet.
              Create one and list hourly stays, overnight stays, or experiences in minutes.
            </p>
            <Link
              href={ROUTES.newListing}
              className="mt-6 inline-flex h-11 items-center gap-2 rounded-full bg-[#800020] px-6 text-sm font-bold text-white hover:bg-[#600018]"
            >
              Create host profile <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <Image
            src="https://res.cloudinary.com/dzjhuss7i/image/upload/v1781029370/empty-host-needed_vum5fe.png"
            alt=""
            width={220}
            height={180}
            className="mx-auto h-auto w-[180px] sm:w-[220px]"
            aria-hidden
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Badge className="mb-2 rounded-full bg-[#f8eef2] text-[#800020] hover:bg-[#f8eef2]">
            {badge}
          </Badge>
          <h1 className="font-brand text-3xl text-[#2b000a] sm:text-4xl">
            {isAdmin ? "Admin overview" : `Welcome back, ${greetingName}`}
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {isAdmin
              ? "Monitor verification badges, payments, disputes, withdrawals, feedback, and demand."
              : "Here’s how your hosting is going."}
          </p>
        </div>
      </div>

      {/* Needs attention */}
      {!isAdmin && pendingRequests > 0 && (
        <Link
          href={ROUTES.dashboardBookings}
          className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3.5 transition-colors hover:bg-amber-100/60"
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
            <AlertTriangle className="h-4 w-4" />
          </span>
          <p className="text-sm font-semibold text-amber-900">
            {pendingRequests} paid booking request{pendingRequests === 1 ? "" : "s"} waiting for your response
          </p>
          <ArrowRight className="ml-auto h-4 w-4 shrink-0 text-amber-700" />
        </Link>
      )}

      {!isAdmin && host && !host.is_verified && (
        <div className="flex items-center gap-3 rounded-2xl border bg-white px-4 py-3.5">
          <Image
            src="https://res.cloudinary.com/dzjhuss7i/image/upload/v1781029380/spot-verified_anp2nf.png"
            alt=""
            width={48}
            height={40}
            className="h-auto w-[44px] shrink-0"
            aria-hidden
          />
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-[#2b000a]">Verification badge pending.</span>{" "}
            Your listings can be live now — admin review only adds the verified badge.
          </p>
        </div>
      )}

      {/* Earnings + quick actions (hosts only) */}
      {!isAdmin && money && (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <div className="flex flex-col justify-between rounded-3xl bg-gradient-to-br from-[#800020] to-[#4a0013] p-6 text-white shadow-md">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-white/70">
                Withdrawable balance
              </p>
              <p className="mt-2 font-brand text-4xl">KES {money.withdrawable.toLocaleString()}</p>
              <p className="mt-3 text-sm text-white/80">
                KES {money.held.toLocaleString()} held until stays complete
              </p>
            </div>
            <Link
              href={ROUTES.dashboardWithdrawals}
              className="mt-6 inline-flex h-10 w-fit items-center gap-2 rounded-full bg-white px-5 text-sm font-bold text-[#800020] transition-colors hover:bg-white/90"
            >
              <Wallet className="h-4 w-4" /> Withdraw funds
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {QUICK_ACTIONS.map(({ label, description, href, icon: Icon }) => (
              <Link
                key={label}
                href={href}
                className="group flex flex-col justify-between rounded-2xl border bg-white p-4 transition-shadow hover:shadow-md"
              >
                <span className="flex size-9 items-center justify-center rounded-xl bg-[#f8eef2] text-[#800020]">
                  <Icon className="h-4 w-4" />
                </span>
                <div className="mt-3">
                  <p className="text-sm font-bold text-[#2b000a]">{label}</p>
                  <p className="mt-0.5 hidden text-xs text-muted-foreground sm:block">{description}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Stats */}
      <div>
        <p className="mb-3 text-sm font-bold uppercase tracking-wide text-[#a08b92]">
          {isAdmin ? "Platform activity" : "Your activity"}
        </p>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {stats.map((stat) => (
            <StatCard key={stat.label} {...stat} />
          ))}
        </div>
      </div>
    </div>
  );
}
