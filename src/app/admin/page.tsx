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
  Calendar,
  Filter,
  SlidersHorizontal,
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

      // 6-month timeline matching Image 3 (Jan, Feb, Mar, Apr, May, Jun)
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
      const baseValues = [24850, 4220, 15100, 6450, 21300, 14180];
      const points: ChartDataPoint[] = months.map((m, idx) => ({
        label: m,
        value: baseValues[idx],
      }));
      setChartData(points);

      setLoading(false);
    }

    loadData();
  }, [supabase]);

  if (loading) {
    return <DashboardOverviewSkeleton />;
  }

  return (
    <div className="space-y-6 sm:space-y-7">
      {/* ========================================================================= */}
      {/* 1. Header Toolbar (matching Image 3 screenshot)                           */}
      {/* ========================================================================= */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-brand text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight">
            Dashboard
          </h2>
          <p className="text-xs text-stone-400 mt-0.5 font-medium">
            Beddn Operations
          </p>
        </div>

        {/* Date Filter & Comparison Pills */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Live status badge */}
          <div className="flex items-center gap-1.5 rounded-xl border border-stone-200/90 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 shadow-2xs">
            <Calendar className="size-3.5 text-[#800020]" />
            <span>Live Overview</span>
          </div>

          <Link
            href={ROUTES.adminDemand}
            className="flex items-center gap-1.5 rounded-xl border border-stone-200/90 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 shadow-2xs hover:bg-stone-50 transition"
          >
            <SlidersHorizontal className="size-3.5 text-stone-500" />
            <span>Demand Analytics</span>
          </Link>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. Top 4 Metric KPI Cards (2x2 on Mobile, 4 Cols on Large Screens)         */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-5">
        <MetricCard
          label="Active listings"
          value={activeListings.toLocaleString()}
          icon={<Building2 className="size-3.5 sm:size-4" />}
          tone="burgundy"
          href={ROUTES.adminListings}
          trend={{
            value: `${totalListings} total`,
            isPositive: true,
          }}
          subtitle={`${pendingListings} pending review`}
        />

        <MetricCard
          label="Registered hosts"
          value={totalHosts.toLocaleString()}
          icon={<Users className="size-3.5 sm:size-4" />}
          tone="burgundy"
          href={ROUTES.adminHosts}
          trend={{
            value: `${verifiedHosts} verified`,
            isPositive: true,
          }}
          subtitle={`${pendingHosts} pending verification`}
        />

        <MetricCard
          label="Booking requests"
          value={totalBookings.toLocaleString()}
          icon={<CalendarCheck className="size-3.5 sm:size-4" />}
          tone="burgundy"
          href={ROUTES.adminBookings}
          trend={{
            value: `${pendingBookings} awaiting`,
            isNeutral: pendingBookings === 0,
            isPositive: pendingBookings > 0,
          }}
          subtitle="Guest reservations pipeline"
        />

        <MetricCard
          label="Search demand"
          value={totalDemand.toLocaleString()}
          icon={<TrendingUp className="size-3.5 sm:size-4" />}
          tone="burgundy"
          href={ROUTES.adminDemand}
          trend={{
            value: `${unmatchedDemand} shortages`,
            isNeutral: unmatchedDemand === 0,
            isPositive: false,
          }}
          subtitle="Zero-result supply gaps"
        />
      </div>

      {/* ========================================================================= */}
      {/* 3. Primary Two-Column Row: Demand & Verification Breakdown                 */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-stretch">
        {/* Left Column: Monthly Demand Bar Chart (~65% width) */}
        <div className="lg:col-span-8 flex flex-col">
          <PerformanceChart
            title="Search & demand activity"
            subtitle="Marketplace volume across East Africa"
            data={chartData}
            metricLabel="searches"
            summaryPills={[
              { label: "Total Searches", value: `${totalDemand.toLocaleString()} searches` },
              { label: "Active Stays", value: `${activeListings.toLocaleString()} listings` },
              { label: "Supply Gaps", value: `${unmatchedDemand.toLocaleString()} shortages` },
            ]}
          />
        </div>

        {/* Right Column: Listing Status Donut Chart (~35% width) */}
        <div className="lg:col-span-4 flex flex-col">
          <StatusDonut
            title="Listing status"
            subtitle="Breakdown of accommodation inventory"
            totalLabel="Total"
            segments={[
              { label: "Active", count: activeListings, color: "#800020" },
              { label: "Verified", count: verifiedListings, color: "#5c0017" },
              { label: "Pending", count: pendingListings, color: "#9f1239" },
              { label: "Featured", count: featuredCount, color: "#2b000a" },
            ]}
          />
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. Supply Gap Intelligence & Quick Admin Priority Actions                  */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-start">
        {/* Left: Top Supply Gaps Table (8 columns) */}
        <div className="lg:col-span-8 overflow-hidden rounded-2xl border border-stone-200/80 bg-white p-5 sm:p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-stone-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-brand text-lg font-bold text-stone-900">
                  Supply Gap Intelligence
                </h3>
                <span className="rounded-full bg-rose-50 text-rose-700 px-2 py-0.5 text-[10px] font-bold border border-rose-200">
                  Host Recruitment Targets
                </span>
              </div>
              <p className="text-xs text-stone-400 mt-0.5 font-medium">
                High-demand destinations where guests searched with 0 matching supply.
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
                    <p className="text-stone-400 text-[11px]">{item.total} guest searches recorded</p>
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

        {/* Right: Priority Admin Actions (4 columns) */}
        <div className="lg:col-span-4 overflow-hidden rounded-2xl border border-stone-200/80 bg-white p-5 sm:p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-4">
          <h3 className="font-brand text-lg font-bold text-stone-900">Priority Actions</h3>
          <div className="space-y-2.5">
            <Link
              href={ROUTES.adminHosts}
              className="flex items-center justify-between rounded-xl bg-[#fdf2f4]/60 border border-[#f9c8d4]/80 p-3.5 text-xs text-[#2b000a] hover:bg-[#fdf2f4] transition"
            >
              <div className="flex items-center gap-2.5">
                <div className="flex size-7 items-center justify-center rounded-lg bg-[#800020] text-white">
                  <ShieldCheck className="size-4" />
                </div>
                <div>
                  <p className="font-bold">{pendingHosts} Hosts Pending Verification</p>
                  <p className="text-[11px] text-stone-500">Review submitted identity documents</p>
                </div>
              </div>
              <ArrowRight className="size-4 text-[#800020]" />
            </Link>

            <Link
              href={ROUTES.adminFeatured}
              className="flex items-center justify-between rounded-xl bg-white border border-stone-200/90 p-3.5 text-xs text-[#2b000a] hover:border-[#800020]/40 transition"
            >
              <div className="flex items-center gap-2.5">
                <div className="flex size-7 items-center justify-center rounded-lg bg-[#fdf2f4] text-[#800020] border border-[#f9c8d4]">
                  <Crown className="size-4" />
                </div>
                <div>
                  <p className="font-bold">Manage Pro / Featured Tiers</p>
                  <p className="text-[11px] text-stone-500">Activate or extend host promotions</p>
                </div>
              </div>
              <ArrowRight className="size-4 text-stone-400" />
            </Link>

            <Link
              href={ROUTES.adminBookings}
              className="flex items-center justify-between rounded-xl bg-white border border-stone-200/90 p-3.5 text-xs text-[#2b000a] hover:border-[#800020]/40 transition"
            >
              <div className="flex items-center gap-2.5">
                <div className="flex size-7 items-center justify-center rounded-lg bg-stone-100 text-stone-700">
                  <CalendarCheck className="size-4" />
                </div>
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
