"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Building2,
  Users,
  ShieldCheck,
  CalendarCheck,
  TrendingUp,
  MessageCircle,
  Crown,
  AlertTriangle,
  ArrowRight,
  MapPin,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ROUTES } from "@/lib/routes";
import { MetricCard } from "@/components/dashboard/metric-card";
import { PerformanceChart, type ChartDataPoint } from "@/components/dashboard/performance-chart";
import { StatusDonut } from "@/components/dashboard/status-donut";
import { DashboardOverviewSkeleton } from "@/components/dashboard-skeletons";
import { Badge } from "@/components/ui/badge";

type DemandStat = {
  query: string;
  total: number;
  unmatched: number;
};

export default function AdminOverviewPage() {
  const supabase = useMemo(() => createClient(), []);
  const [loading, setLoading] = useState(true);

  // Counts
  const [totalListings, setTotalListings] = useState(0);
  const [activeListings, setActiveListings] = useState(0);
  const [pendingListings, setPendingListings] = useState(0);
  const [verifiedListings, setVerifiedListings] = useState(0);

  const [totalHosts, setTotalHosts] = useState(0);
  const [pendingHosts, setPendingHosts] = useState(0);
  const [verifiedHosts, setVerifiedHosts] = useState(0);

  const [totalUsers, setTotalUsers] = useState(0);
  const [totalBookings, setTotalBookings] = useState(0);
  const [pendingBookings, setPendingBookings] = useState(0);
  const [totalInquiries, setTotalInquiries] = useState(0);

  const [totalDemand, setTotalDemand] = useState(0);
  const [unmatchedDemand, setUnmatchedDemand] = useState(0);
  const [topSupplyGaps, setTopSupplyGaps] = useState<DemandStat[]>([]);

  const [featuredCount, setFeaturedCount] = useState(0);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);

  useEffect(() => {
    async function loadData() {
      const [
        listingsRes,
        hostsRes,
        usersRes,
        bookingsRes,
        inquiriesRes,
        demandRes,
        featuredRes,
      ] = await Promise.all([
        supabase.from("listings").select("id, is_active, is_verified, listing_status"),
        supabase.from("hosts").select("id, is_verified, status, verification_status"),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("bookings").select("id, status, created_at"),
        supabase.from("inquiries").select("id, status, created_at"),
        supabase.from("search_demand").select("id, query, results_count, created_at").order("created_at", { ascending: false }).limit(500),
        supabase.from("featured_listings").select("id", { count: "exact", head: true }).eq("status", "active"),
      ]);

      // Listings breakdown
      const listRows = listingsRes.data || [];
      setTotalListings(listRows.length);
      setActiveListings(listRows.filter((l) => l.is_active || l.listing_status === "active").length);
      setVerifiedListings(listRows.filter((l) => l.is_verified).length);
      setPendingListings(listRows.filter((l) => !l.is_verified || l.listing_status === "pending").length);

      // Hosts breakdown
      const hostRows = hostsRes.data || [];
      setTotalHosts(hostRows.length);
      setVerifiedHosts(hostRows.filter((h) => h.is_verified).length);
      setPendingHosts(hostRows.filter((h) => !h.is_verified || h.status === "pending" || h.verification_status === "under_review").length);

      // Users & Bookings
      setTotalUsers(usersRes.count || 0);
      const bookingRows = bookingsRes.data || [];
      setTotalBookings(bookingRows.length);
      setPendingBookings(bookingRows.filter((b) => b.status === "requested" || b.status === "paid_pending_host").length);
      setTotalInquiries(inquiriesRes.data?.length || 0);

      // Featured
      setFeaturedCount(featuredRes.count || 0);

      // Demand analysis & supply gaps
      const demandRows = demandRes.data || [];
      setTotalDemand(demandRows.length);
      setUnmatchedDemand(demandRows.filter((d) => d.results_count === 0).length);

      const queryMap = new Map<string, { total: number; unmatched: number }>();
      demandRows.forEach((row) => {
        const q = (row.query || "(Nearby searches)").trim().toLowerCase();
        const current = queryMap.get(q) || { total: 0, unmatched: 0 };
        current.total += 1;
        if (row.results_count === 0) current.unmatched += 1;
        queryMap.set(q, current);
      });

      const topGaps = Array.from(queryMap.entries())
        .map(([query, val]) => ({ query: query.charAt(0).toUpperCase() + query.slice(1), total: val.total, unmatched: val.unmatched }))
        .sort((a, b) => b.unmatched - a.unmatched || b.total - a.total)
        .slice(0, 5);

      setTopSupplyGaps(topGaps);

      // 7-day demand timeline
      const points: ChartDataPoint[] = [];
      const now = new Date();
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const label = d.toLocaleDateString(undefined, { weekday: "short" });
        const count = demandRows.filter((row) => {
          const itemDate = new Date(row.created_at);
          return itemDate.getDate() === d.getDate() && itemDate.getMonth() === d.getMonth();
        }).length;
        points.push({ label, value: count });
      }
      setChartData(points);

      setLoading(false);
    }

    loadData();
  }, [supabase]);

  if (loading) {
    return <DashboardOverviewSkeleton />;
  }

  return (
    <div className="space-y-8">
      {/* ========================================================================= */}
      {/* 1. Header Toolbar                                                         */}
      {/* ========================================================================= */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-stone-200/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-brand text-2xl sm:text-3xl font-black text-[#181113] tracking-tight">
              Marketplace Command Center
            </h2>
            <Badge className="rounded-full bg-[#fdf2f4] text-[#800020] border border-[#f9c8d4] text-xs font-bold px-2.5 py-0.5">
              Live Operations
            </Badge>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            Real-time supply, guest demand intelligence, verification pipeline, and listing promotion.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Link
            href={ROUTES.adminAnnouncements}
            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-stone-300 bg-white px-4 text-xs font-bold text-stone-800 hover:border-[#800020] hover:text-[#800020] shadow-2xs transition"
          >
            <span>Host Announcement</span>
          </Link>
          <Link
            href={ROUTES.adminDemand}
            className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[#800020] px-4 text-xs font-bold text-white hover:bg-[#68001a] shadow-xs transition"
          >
            <span>Demand Intelligence</span>
          </Link>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. Top Summary KPI Cards                                                  */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Total Properties"
          value={totalListings.toLocaleString()}
          icon={<Building2 className="size-5" />}
          tone="burgundy"
          href={ROUTES.adminListings}
          trend={{
            value: `${activeListings} Active`,
            isPositive: activeListings > 0,
            label: `${pendingListings} pending review`,
          }}
          subtitle="Accommodations & Spaces"
        />

        <MetricCard
          label="Host Network"
          value={totalHosts.toLocaleString()}
          icon={<Users className="size-5" />}
          tone="emerald"
          href={ROUTES.adminHosts}
          trend={{
            value: `${verifiedHosts} Verified`,
            isPositive: verifiedHosts > 0,
            label: `${pendingHosts} require review`,
          }}
          subtitle="Registered Property Hosts"
        />

        <MetricCard
          label="Guest Demand Searches"
          value={totalDemand.toLocaleString()}
          icon={<TrendingUp className="size-5" />}
          tone="rose"
          href={ROUTES.adminDemand}
          trend={{
            value: `${unmatchedDemand} supply gaps`,
            isPositive: false,
            label: "0 matching results found",
          }}
          subtitle="Real guest search activity"
        />

        <MetricCard
          label="Pro & Featured Tiers"
          value={featuredCount.toLocaleString()}
          icon={<Crown className="size-5 text-amber-500" />}
          tone="amber"
          href={ROUTES.adminFeatured}
          trend={{
            value: `${totalBookings} Total Bookings`,
            isNeutral: true,
            label: `${pendingBookings} active requests`,
          }}
          subtitle="Monetized visibility tiers"
        />
      </div>

      {/* ========================================================================= */}
      {/* 3. Demand Intelligence & Supply Gap Spotlight (Section 8)                 */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left: Top Supply Gaps Table (2 columns) */}
        <div className="lg:col-span-2 overflow-hidden rounded-3xl border border-stone-200/90 bg-white p-6 sm:p-8 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-stone-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-brand text-xl font-bold text-[#181113]">
                  Supply Gap Intelligence
                </h3>
                <span className="rounded-full bg-rose-50 text-rose-700 px-2 py-0.5 text-[10px] font-bold border border-rose-200">
                  Host Recruitment Targets
                </span>
              </div>
              <p className="text-xs text-stone-500 mt-0.5">
                Destinations where guests searched but Beddn had insufficient or 0 matching supply.
              </p>
            </div>
            <Link
              href={ROUTES.adminDemand}
              className="inline-flex items-center gap-1 text-xs font-bold text-[#800020] hover:underline"
            >
              <span>View all demand</span>
              <ArrowRight className="size-3.5" />
            </Link>
          </div>

          <div className="mt-4 divide-y divide-stone-100">
            {topSupplyGaps.map((item, idx) => (
              <div key={idx} className="py-3 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <div className="flex size-8 items-center justify-center rounded-xl bg-[#fdf2f4] text-[#800020] font-bold">
                    <MapPin className="size-4" />
                  </div>
                  <div>
                    <p className="font-bold text-sm text-stone-900">{item.query}</p>
                    <p className="text-stone-500 text-[11px]">{item.total} guest searches recorded</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-right">
                  <div>
                    <span className="font-mono font-black text-rose-600 text-sm block">
                      {item.unmatched} unmatched
                    </span>
                    <span className="text-[10px] text-stone-400">supply shortage</span>
                  </div>
                  <Link
                    href={`${ROUTES.adminHosts}?recruitCity=${encodeURIComponent(item.query)}`}
                    className="hidden sm:inline-flex h-8 items-center rounded-full bg-stone-100 px-3 text-[11px] font-bold text-stone-700 hover:bg-[#800020] hover:text-white transition"
                  >
                    Recruit Hosts
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Verification Status Ring (1 column) */}
        <div>
          <StatusDonut
            title="Listing Health & Trust"
            subtitle="Verification status across listings"
            totalLabel="Listings"
            segments={[
              { label: "Verified Active", count: verifiedListings, color: "#059669" },
              { label: "Pending Verification", count: pendingListings, color: "#d97706" },
              { label: "Promoted (Pro)", count: featuredCount, color: "#800020" },
              { label: "Unverified / Draft", count: Math.max(0, totalListings - verifiedListings - pendingListings), color: "#a8a29e" },
            ]}
          />
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. Demand Trend Chart & Quick Operations                                  */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2">
          <PerformanceChart
            title="Weekly Marketplace Search Demand"
            subtitle="Volume of traveler discovery searches across Africa over the past 7 days"
            data={chartData}
            metricLabel="searches"
            summaryPills={[
              { label: "Total Searches", value: totalDemand.toLocaleString() },
              { label: "Unmatched Searches", value: unmatchedDemand.toLocaleString() },
              {
                label: "Supply Fulfillment Rate",
                value: totalDemand > 0 ? `${(((totalDemand - unmatchedDemand) / totalDemand) * 100).toFixed(0)}%` : "0%",
              },
            ]}
          />
        </div>

        {/* Quick Admin Actions Box */}
        <div className="overflow-hidden rounded-3xl border border-stone-200/90 bg-white p-6 shadow-xs space-y-4">
          <h3 className="font-brand text-lg font-bold text-[#181113]">Priority Actions</h3>
          <div className="space-y-2.5">
            <Link
              href={ROUTES.adminHosts}
              className="flex items-center justify-between rounded-2xl bg-amber-50/60 border border-amber-200/60 p-3.5 text-xs text-amber-900 hover:bg-amber-100/60 transition"
            >
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="size-4 text-amber-600 shrink-0" />
                <div>
                  <p className="font-bold">{pendingHosts} Hosts Pending Verification</p>
                  <p className="text-[11px] text-amber-700">Review submitted national IDs</p>
                </div>
              </div>
              <ArrowRight className="size-4 text-amber-600" />
            </Link>

            <Link
              href={ROUTES.adminFeatured}
              className="flex items-center justify-between rounded-2xl bg-[#fdf2f4]/70 border border-[#f9c8d4] p-3.5 text-xs text-[#800020] hover:bg-[#fdf2f4] transition"
            >
              <div className="flex items-center gap-2.5">
                <Crown className="size-4 text-amber-500 shrink-0" />
                <div>
                  <p className="font-bold">Manage Pro / Featured Tiers</p>
                  <p className="text-[11px] text-stone-600">Activate or extend host promotions</p>
                </div>
              </div>
              <ArrowRight className="size-4 text-[#800020]" />
            </Link>

            <Link
              href={ROUTES.adminBookings}
              className="flex items-center justify-between rounded-2xl bg-stone-50 border border-stone-200/80 p-3.5 text-xs text-stone-800 hover:bg-stone-100 transition"
            >
              <div className="flex items-center gap-2.5">
                <CalendarCheck className="size-4 text-emerald-600 shrink-0" />
                <div>
                  <p className="font-bold">{pendingBookings} Booking Requests Active</p>
                  <p className="text-[11px] text-stone-500">Monitor host confirmations</p>
                </div>
              </div>
              <ArrowRight className="size-4 text-stone-400" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
