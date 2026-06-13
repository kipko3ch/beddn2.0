"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ROUTES } from "@/lib/routes";
import {
  AlertTriangle,
  CalendarCheck,
  CreditCard,
  Home,
  MessageSquare,
  ShieldCheck,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";

type Stat = {
  label: string;
  value: number;
  icon: React.ElementType;
  href: string;
  tone?: "brand" | "warning";
};

export default function AdminOverviewPage() {
  const supabase = useMemo(() => createClient(), []);
  const [stats, setStats] = useState<Stat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [
        users,
        suspended,
        pendingHosts,
        pendingListings,
        paidBookings,
        disputes,
        withdrawals,
        feedback,
        demand,
        payments,
      ] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("suspended", true),
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
        supabase.from("payments").select("id", { count: "exact", head: true }).eq("status", "initialized"),
      ]);

      setStats([
        { label: "Total users", value: users.count ?? 0, icon: Users, href: ROUTES.adminUsers },
        { label: "Suspended users", value: suspended.count ?? 0, icon: AlertTriangle, href: ROUTES.adminUsers, tone: "warning" },
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
    }
    load();
  }, [supabase]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-brand text-3xl text-[#2b000a]">Admin overview</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage users, verify hosts and listings, and monitor payments, disputes, withdrawals, feedback, and demand.
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-muted/50" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {stats.map((stat) => (
            <Link key={stat.label} href={stat.href}>
              <Card
                className={`h-full transition-shadow hover:shadow-sm ${
                  stat.tone === "warning" && stat.value > 0 ? "border-[#e0b4c0]" : ""
                }`}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xs font-medium text-muted-foreground">
                    {stat.label}
                  </CardTitle>
                  <stat.icon
                    className={`h-4 w-4 ${
                      stat.tone === "warning" ? "text-[#800020]" : "text-muted-foreground"
                    }`}
                  />
                </CardHeader>
                <CardContent>
                  <p className="font-brand text-3xl text-[#2b000a]">{stat.value}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
