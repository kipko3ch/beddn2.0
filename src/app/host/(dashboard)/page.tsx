"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Building2,
  CalendarCheck,
  Eye,
  MessageSquare,
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ROUTES } from "@/lib/routes";
import { MetricCard } from "@/components/dashboard/metric-card";
import { PerformanceChart, type ChartDataPoint } from "@/components/dashboard/performance-chart";
import { StatusDonut } from "@/components/dashboard/status-donut";
import { DashboardOverviewSkeleton } from "@/components/dashboard-skeletons";
import { Badge } from "@/components/ui/badge";
import { VerifiedBadge, PendingVerificationBadge } from "@/components/ui/verified-badge";

type HostProfile = {
  id: string;
  name?: string | null;
  is_verified: boolean;
  verification_status: string;
  status: string;
};

type ListingItem = {
  id: string;
  title?: string | null;
  name?: string | null;
  city?: string | null;
  is_active: boolean;
  is_verified?: boolean;
  listing_status?: string | null;
  photos?: string[];
  description?: string | null;
  price_per_night?: number | null;
  hourly_rate?: number | null;
};

type BookingItem = {
  id: string;
  status: string;
  total_amount?: number;
  currency?: string;
  created_at: string;
  listing_id: string;
};

type InquiryItem = {
  id: string;
  status: string;
  created_at: string;
  listing_id: string;
};

type EventItem = {
  event_type: string;
  listing_id: string | null;
  created_at: string;
};

type DateRange = "7d" | "30d" | "90d" | "all";

export default function HostDashboardPage() {
  const supabase = useMemo(() => createClient(), []);
  const [loading, setLoading] = useState(true);
  const [host, setHost] = useState<HostProfile | null>(null);
  const [listings, setListings] = useState<ListingItem[]>([]);
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [inquiries, setInquiries] = useState<InquiryItem[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [activeTier, setActiveTier] = useState<string | null>(null);
  const [tierExpiry, setTierExpiry] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState("");
  const [dateRange, setDateRange] = useState<DateRange>("30d");

  useEffect(() => {
    async function loadData() {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) {
        setLoading(false);
        return;
      }
      setUserEmail(authData.user.email ?? "");

      // 1. Fetch host profile
      const { data: hostData } = await supabase
        .from("hosts")
        .select("id, name, is_verified, verification_status, status")
        .eq("user_id", authData.user.id)
        .maybeSingle();

      if (!hostData) {
        setLoading(false);
        return;
      }
      setHost(hostData as HostProfile);

      // 2. Fetch listings for this host
      const { data: listingData } = await supabase
        .from("listings")
        .select("id, title, name, city, is_active, is_verified, listing_status, photos, description, price_per_night, hourly_rate")
        .eq("host_id", hostData.id);

      const hostListings = (listingData as ListingItem[]) || [];
      setListings(hostListings);
      const listingIds = hostListings.map((l) => l.id);

      // 3. Parallel fetch of Bookings, Inquiries, Listing Events, and Pro Tiers
      const [bookingsRes, inquiriesRes, eventsRes, featuredRes] = await Promise.all([
        supabase
          .from("bookings")
          .select("id, status, total_amount, currency, created_at, listing_id")
          .eq("host_id", hostData.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("inquiries")
          .select("id, status, created_at, listing_id")
          .eq("host_id", hostData.id)
          .order("created_at", { ascending: false }),
        listingIds.length > 0
          ? supabase
              .from("listing_events")
              .select("event_type, listing_id, created_at")
              .in("listing_id", listingIds)
              .limit(5000)
          : Promise.resolve({ data: [] }),
        supabase
          .from("featured_listings")
          .select("tier_name, end_date, status")
          .eq("host_id", hostData.id)
          .eq("status", "active")
          .gt("end_date", new Date().toISOString())
          .order("end_date", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      setBookings((bookingsRes.data as BookingItem[]) || []);
      setInquiries((inquiriesRes.data as InquiryItem[]) || []);
      setEvents((eventsRes.data as EventItem[]) || []);

      if (featuredRes.data) {
        setActiveTier(featuredRes.data.tier_name || "Pro");
        setTierExpiry(
          featuredRes.data.end_date
            ? new Date(featuredRes.data.end_date).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric",
              })
            : null
        );
      }

      setLoading(false);
    }

    loadData();
  }, [supabase]);

  // Date range filter cutoff
  const filterCutoff = useMemo(() => {
    if (dateRange === "all") return null;
    const now = Date.now();
    const days = dateRange === "7d" ? 7 : dateRange === "30d" ? 30 : 90;
    return new Date(now - days * 24 * 60 * 60 * 1000);
  }, [dateRange]);

  const filteredEvents = useMemo(() => {
    if (!filterCutoff) return events;
    return events.filter((e) => new Date(e.created_at) >= filterCutoff);
  }, [events, filterCutoff]);

  const filteredInquiries = useMemo(() => {
    if (!filterCutoff) return inquiries;
    return inquiries.filter((i) => new Date(i.created_at) >= filterCutoff);
  }, [inquiries, filterCutoff]);

  const filteredBookings = useMemo(() => {
    if (!filterCutoff) return bookings;
    return bookings.filter((b) => new Date(b.created_at) >= filterCutoff);
  }, [bookings, filterCutoff]);

  // Counts
  const viewsCount = filteredEvents.filter((e) => e.event_type === "LISTING_VIEW").length;
  const whatsappClicks = filteredEvents.filter((e) => e.event_type === "WHATSAPP_CLICK").length;
  const inquiriesCount = filteredInquiries.length;
  const totalLeads = inquiriesCount + whatsappClicks;

  const pendingBookings = bookings.filter((b) => b.status === "requested" || b.status === "paid_pending_host");
  const confirmedBookings = bookings.filter((b) => b.status === "confirmed");
  const activeListingsCount = listings.filter((l) => l.is_active || l.listing_status === "active").length;

  // Chart data: daily grouping over the chosen period
  const chartData = useMemo(() => {
    const days = dateRange === "7d" ? 7 : dateRange === "30d" ? 14 : 12;
    const points: ChartDataPoint[] = [];
    const now = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i * (dateRange === "90d" ? 7 : 1));
      const dateStr = d.toLocaleDateString(undefined, { month: "short", day: "numeric" });

      const dayEvents = filteredEvents.filter((e) => {
        const itemDate = new Date(e.created_at);
        return (
          itemDate.getDate() === d.getDate() &&
          itemDate.getMonth() === d.getMonth() &&
          itemDate.getFullYear() === d.getFullYear()
        );
      });

      points.push({
        label: dateStr,
        value: dayEvents.filter((e) => e.event_type === "LISTING_VIEW").length,
      });
    }

    return points;
  }, [filteredEvents, dateRange]);

  // Listing completeness calculator
  function computeCompleteness(l: ListingItem) {
    let score = 0;
    const tips: string[] = [];

    if (l.title || l.name) score += 20;
    else tips.push("Add a descriptive property title");

    if (l.description && l.description.length > 50) score += 20;
    else tips.push("Write a detailed description (50+ words)");

    if (l.photos && l.photos.length >= 4) score += 30;
    else if (l.photos && l.photos.length > 0) {
      score += 15;
      tips.push(`Add ${4 - l.photos.length} more photos`);
    } else {
      tips.push("Upload at least 4 high-quality photos");
    }

    if (l.price_per_night || l.hourly_rate) score += 20;
    else tips.push("Set overnight or hourly pricing");

    if (l.is_verified) score += 10;
    else tips.push("Complete verification badge review");

    return { score, tips };
  }

  if (loading) {
    return <DashboardOverviewSkeleton />;
  }

  // Not a host yet
  if (!host) {
    return (
      <div className="overflow-hidden rounded-3xl border border-stone-200 bg-white p-8 text-center sm:p-12 shadow-sm">
        <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-[#fdf2f4] text-[#800020] mb-4">
          <Building2 className="size-8" />
        </div>
        <h2 className="font-brand text-3xl font-bold text-[#181113]">Become a Beddn Host</h2>
        <p className="mt-2 text-sm text-stone-600 max-w-md mx-auto leading-relaxed">
          List your spare room, apartment, conference hall, or unique space across East Africa and start receiving verified guests.
        </p>
        <Link
          href={ROUTES.newListing}
          className="mt-6 inline-flex h-11 items-center gap-2 rounded-full bg-[#800020] px-7 text-sm font-bold text-white shadow-md hover:bg-[#68001a] transition"
        >
          <span>Create Host Listing</span>
          <ArrowRight className="size-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* ========================================================================= */}
      {/* 1. Header Toolbar: Title, Host Status & Period Filters                    */}
      {/* ========================================================================= */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-stone-200/80 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="font-brand text-2xl sm:text-3xl font-black text-[#181113] tracking-tight">
              Host Overview
            </h2>
            {host.is_verified ? (
              <VerifiedBadge text="Verified Host" size="sm" />
            ) : (
              <PendingVerificationBadge />
            )}
          </div>
          <p className="text-xs text-stone-500 mt-1">
            Real-time performance and actionable recommendations for your properties.
          </p>
        </div>

        {/* Date Range Selector (matching screenshot) */}
        <div className="flex items-center gap-1.5 rounded-full border border-stone-200/80 bg-white p-1 shadow-2xs self-start sm:self-auto">
          {(["7d", "30d", "90d", "all"] as DateRange[]).map((period) => (
            <button
              key={period}
              type="button"
              onClick={() => setDateRange(period)}
              className={`rounded-full px-3 py-1 text-xs font-bold transition ${
                dateRange === period
                  ? "bg-[#800020] text-white shadow-2xs"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              {period === "7d" ? "7 Days" : period === "30d" ? "30 Days" : period === "90d" ? "90 Days" : "All Time"}
            </button>
          ))}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. Top Summary KPI Cards (2x2 on Mobile, 4 Cols on Large Screens)         */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        <MetricCard
          label="Total Views"
          value={viewsCount.toLocaleString()}
          icon={<Eye className="size-4 sm:size-5" />}
          tone="burgundy"
          trend={{ value: `${viewsCount} total`, isPositive: viewsCount > 0, label: "impressions" }}
          subtitle="Real guest views"
        />

        <MetricCard
          label="Inquiries & WhatsApp"
          value={totalLeads.toLocaleString()}
          icon={<MessageSquare className="size-4 sm:size-5" />}
          tone="rose"
          href={ROUTES.dashboardInquiries}
          trend={{ value: `${inquiriesCount} in-app · ${whatsappClicks} WA`, isPositive: totalLeads > 0 }}
          subtitle="Direct guest interest"
        />

        <MetricCard
          label="Booking Requests"
          value={bookings.length.toLocaleString()}
          icon={<CalendarCheck className="size-4 sm:size-5" />}
          tone="emerald"
          href={ROUTES.dashboardBookings}
          trend={{
            value: `${pendingBookings.length} pending · ${confirmedBookings.length} ok`,
            isPositive: pendingBookings.length > 0,
          }}
          subtitle="Reservation pipeline"
        />

        <MetricCard
          label="Active Properties"
          value={`${activeListingsCount} / ${listings.length}`}
          icon={<Building2 className="size-4 sm:size-5" />}
          tone="amber"
          href={ROUTES.dashboardListings}
          trend={{
            value: activeTier ? `${activeTier} Tier` : "Free Tier",
            isNeutral: !activeTier,
            isPositive: Boolean(activeTier),
          }}
          subtitle="Published spaces"
        />
      </div>

      {/* ========================================================================= */}
      {/* 3. Performance Chart & Status Donut (Inspired by the Reference Image)      */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Bar Chart (2 columns) */}
        <div className="lg:col-span-2">
          <PerformanceChart
            title="Listing Views & Guest Engagement"
            subtitle={`Guest traffic across your properties (${dateRange === "7d" ? "Last 7 days" : dateRange === "30d" ? "Last 30 days" : "Selected period"})`}
            data={chartData}
            metricLabel="views"
            summaryPills={[
              { label: "Total Views", value: viewsCount.toLocaleString() },
              { label: "Total Inquiries", value: inquiriesCount.toLocaleString() },
              {
                label: "Conversion Rate",
                value: viewsCount > 0 ? `${((totalLeads / viewsCount) * 100).toFixed(1)}%` : "0%",
              },
            ]}
          />
        </div>

        {/* Status Breakdown Donut (1 column) */}
        <div>
          <StatusDonut
            title="Property Breakdown"
            subtitle="Current status of your listings"
            totalLabel="Listings"
            segments={[
              {
                label: "Active Listings",
                count: activeListingsCount,
                color: "#800020",
              },
              {
                label: "Pending Verification",
                count: listings.filter((l) => !l.is_verified && (l.is_active || l.listing_status === "active")).length,
                color: "#9f1239",
              },
              {
                label: "Pro / Featured",
                count: activeTier ? activeListingsCount : 0,
                color: "#2b000a",
              },
              {
                label: "Drafts / Inactive",
                count: listings.filter((l) => !l.is_active && l.listing_status !== "active").length,
                color: "#78716c",
              },
            ]}
          />
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. Actionable "What should I do next?" Banner -> Links to Checklist Page   */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl sm:rounded-3xl border border-stone-200/90 bg-gradient-to-br from-[#fdf2f4]/80 via-white to-[#fbf7f8] p-4 sm:p-6 shadow-xs">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="flex size-10 sm:size-11 shrink-0 items-center justify-center rounded-2xl bg-[#800020] text-white shadow-2xs">
            <CheckCircle2 className="size-5 sm:size-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-brand text-base sm:text-lg font-bold text-[#181113]">
                What should I do next?
              </h3>
              <span className="rounded-full bg-[#800020]/10 px-2.5 py-0.5 text-[11px] font-bold text-[#800020] border border-[#800020]/20">
                Host Checklist
              </span>
            </div>
            <p className="text-xs text-stone-500 mt-1 max-w-xl leading-relaxed">
              {host.is_verified ? "Badge active · " : "Verification pending · "}
              {pendingBookings.length > 0
                ? `${pendingBookings.length} booking request awaiting confirmation`
                : "Inquiries up to date"}
              {" · "}
              {activeTier ? `${activeTier} active` : "Pro boost available"}
            </p>
          </div>
        </div>

        <Link
          href={ROUTES.dashboardChecklist}
          className="inline-flex h-9 sm:h-10 shrink-0 items-center justify-center gap-2 rounded-full bg-[#800020] px-4 sm:px-5 text-xs font-bold text-white shadow-xs hover:bg-[#68001a] active:scale-98 transition self-start sm:self-auto"
        >
          <span>Open Checklist</span>
          <ArrowRight className="size-3.5" />
        </Link>
      </div>

      {/* ========================================================================= */}
      {/* 5. Individual Listing Performance & Completeness (Section 13, 14, 15)      */}
      {/* ========================================================================= */}
      <div className="rounded-3xl border border-stone-200/90 bg-white p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-stone-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-brand text-xl font-bold text-[#181113]">
                Individual Property Performance
              </h3>
              <Badge className="rounded-full bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-bold">
                Analytics — Beta
              </Badge>
            </div>
            <p className="text-xs text-stone-500 mt-0.5">
              Detailed view tracking, guest inquiries, and completeness score per property.
            </p>
          </div>

          <Link
            href={ROUTES.newListing}
            className="inline-flex items-center gap-1.5 rounded-full bg-[#800020] px-4 py-2 text-xs font-bold text-white hover:bg-[#68001a] transition self-start sm:self-auto"
          >
            <span>+ Add New Listing</span>
          </Link>
        </div>

        {listings.length === 0 ? (
          <div className="py-12 text-center">
            <Building2 className="size-12 text-stone-300 mx-auto mb-3" />
            <p className="text-sm font-bold text-stone-700">No properties added yet</p>
            <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
              Create your first listing to start receiving views, guest inquiries, and bookings.
            </p>
            <Link
              href={ROUTES.newListing}
              className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-[#800020] px-5 py-2 text-xs font-bold text-white"
            >
              List your space
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-stone-100 overflow-x-auto">
            {listings.map((l) => {
              const { score, tips } = computeCompleteness(l);
              const lViews = events.filter((e) => e.listing_id === l.id && e.event_type === "LISTING_VIEW").length;
              const lInquiries = inquiries.filter((i) => i.listing_id === l.id).length;
              const lBookings = bookings.filter((b) => b.listing_id === l.id).length;

              return (
                <div key={l.id} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  {/* Left: Thumbnail & Details */}
                  <div className="flex items-center gap-3.5 min-w-0 md:w-1/3">
                    <div className="relative size-14 shrink-0 overflow-hidden rounded-2xl bg-stone-100 border border-stone-200">
                      {l.photos && l.photos[0] ? (
                        <Image
                          src={l.photos[0]}
                          alt={l.title || "Listing"}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex size-full items-center justify-center text-stone-400">
                          <Building2 className="size-6" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="truncate text-sm font-bold text-stone-900 leading-tight">
                          {l.title || l.name || "Untitled space"}
                        </p>
                        {l.is_verified && (
                          <span title="Verified">
                            <ShieldCheck className="size-3.5 text-emerald-600 shrink-0" />
                          </span>
                        )}
                      </div>
                      <p className="truncate text-xs text-stone-500 mt-0.5">
                        {l.city || "East Africa"} · {l.price_per_night ? `KES ${l.price_per_night}/night` : l.hourly_rate ? `KES ${l.hourly_rate}/hr` : "No price set"}
                      </p>
                      <div className="mt-1 flex items-center gap-1.5">
                        <span
                          className={`inline-block size-2 rounded-full ${
                            l.is_active ? "bg-emerald-500" : "bg-stone-300"
                          }`}
                        />
                        <span className="text-[11px] font-semibold text-stone-600">
                          {l.is_active ? "Active" : "Inactive / Draft"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Middle: Real Performance Metrics */}
                  <div className="flex items-center gap-6 text-xs text-stone-600">
                    <div className="text-center">
                      <span className="font-mono font-bold text-sm text-stone-900 block">{lViews}</span>
                      <span className="text-[11px] text-stone-400">views</span>
                    </div>
                    <div className="text-center">
                      <span className="font-mono font-bold text-sm text-[#800020] block">{lInquiries}</span>
                      <span className="text-[11px] text-stone-400">inquiries</span>
                    </div>
                    <div className="text-center">
                      <span className="font-mono font-bold text-sm text-emerald-700 block">{lBookings}</span>
                      <span className="text-[11px] text-stone-400">bookings</span>
                    </div>
                  </div>

                  {/* Right: Completeness Score & Recommendations */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 md:w-1/3 justify-end">
                    <div className="min-w-32">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-medium text-stone-600">Completeness</span>
                        <strong className="font-bold text-[#800020]">{score}%</strong>
                      </div>
                      <div className="h-2 w-full rounded-full bg-stone-100 overflow-hidden">
                        <div
                          style={{ width: `${score}%` }}
                          className={`h-full rounded-full transition-all ${
                            score >= 80 ? "bg-emerald-500" : score >= 50 ? "bg-amber-500" : "bg-[#800020]"
                          }`}
                        />
                      </div>
                      {tips.length > 0 && (
                        <p className="text-[10px] text-stone-500 truncate mt-1">
                          Tip: {tips[0]}
                        </p>
                      )}
                    </div>

                    <Link
                      href={ROUTES.dashboardListings}
                      className="inline-flex h-8 items-center justify-center rounded-full border border-stone-200 px-3 text-xs font-semibold text-stone-700 hover:border-[#800020] hover:text-[#800020] transition"
                    >
                      Manage
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
