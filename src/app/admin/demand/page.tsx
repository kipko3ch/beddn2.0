"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  TrendingUp,
  MapPin,
  Calendar,
  Users,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Filter,
  Search,
  Building2,
  Clock,
  Sparkles,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ROUTES } from "@/lib/routes";
import { MetricCard } from "@/components/dashboard/metric-card";
import { DashboardTableSkeleton } from "@/components/dashboard-skeletons";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import type { SearchDemand } from "@/lib/types";

interface DestinationGap {
  destination: string;
  totalSearches: number;
  unmatchedSearches: number;
  matchingListings: number;
  gapLevel: "critical" | "moderate" | "healthy";
}

export default function AdminDemandPage() {
  const supabase = useMemo(() => createClient(), []);
  const [loading, setLoading] = useState(true);
  const [demandEntries, setDemandEntries] = useState<SearchDemand[]>([]);
  const [destinationGaps, setDestinationGaps] = useState<DestinationGap[]>([]);
  const [filterMode, setFilterMode] = useState<"all" | "unmatched" | "with_dates">("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    async function loadDemand() {
      setLoading(true);

      const [demandRes, listingsRes] = await Promise.all([
        supabase
          .from("search_demand")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(300),
        supabase
          .from("listings")
          .select("id, city, is_active, listing_status"),
      ]);

      const entries = (demandRes.data as SearchDemand[]) || [];
      setDemandEntries(entries);

      const activeListings = (listingsRes.data || []).filter(
        (l) => l.is_active || l.listing_status === "active"
      );

      // Compute destination gaps
      const map = new Map<string, { total: number; unmatched: number }>();
      entries.forEach((e) => {
        const dest = (e.query || "Local Area Searches").trim();
        const key = dest.toLowerCase();
        const current = map.get(key) || { total: 0, unmatched: 0 };
        current.total += 1;
        if (e.results_count === 0 || e.status === "unmatched") {
          current.unmatched += 1;
        }
        map.set(key, current);
      });

      const gaps: DestinationGap[] = Array.from(map.entries())
        .map(([key, stats]) => {
          const capitalized = key.charAt(0).toUpperCase() + key.slice(1);
          const matching = activeListings.filter(
            (l) => l.city && l.city.toLowerCase().includes(key)
          ).length;

          let gapLevel: "critical" | "moderate" | "healthy" = "healthy";
          if (matching === 0 || stats.unmatched >= stats.total * 0.5) {
            gapLevel = "critical";
          } else if (stats.unmatched > 0) {
            gapLevel = "moderate";
          }

          return {
            destination: capitalized,
            totalSearches: stats.total,
            unmatchedSearches: stats.unmatched,
            matchingListings: matching,
            gapLevel,
          };
        })
        .sort((a, b) => b.unmatchedSearches - a.unmatchedSearches || b.totalSearches - a.totalSearches);

      setDestinationGaps(gaps);
      setLoading(false);
    }

    loadDemand();
  }, [supabase]);

  const totalSearches = demandEntries.length;
  const totalUnmatched = demandEntries.filter(
    (e) => e.results_count === 0 || e.status === "unmatched"
  ).length;
  const criticalGapsCount = destinationGaps.filter((g) => g.gapLevel === "critical").length;
  const fulfillmentRate =
    totalSearches > 0 ? Math.round(((totalSearches - totalUnmatched) / totalSearches) * 100) : 100;

  const filteredEntries = useMemo(() => {
    return demandEntries.filter((item) => {
      if (filterMode === "unmatched" && item.results_count !== 0 && item.status !== "unmatched") {
        return false;
      }
      if (filterMode === "with_dates" && !item.check_in) {
        return false;
      }
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          (item.query || "").toLowerCase().includes(q) ||
          (item.category || "").toLowerCase().includes(q) ||
          (item.property_type || "").toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [demandEntries, filterMode, searchQuery]);

  if (loading) {
    return <DashboardTableSkeleton />;
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
              Marketplace Demand &amp; Supply Gaps
            </h2>
            <Badge className="rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold px-2.5 py-0.5">
              Growth Intelligence
            </Badge>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            Track what guests are actively searching for and identify exact destinations where supply is needed.
          </p>
        </div>

        <Link
          href={ROUTES.adminHosts}
          className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[#800020] px-4 text-xs font-bold text-white hover:bg-[#68001a] shadow-xs transition self-start sm:self-auto"
        >
          <Users className="size-4" />
          <span>Recruit Hosts for Supply Gaps</span>
        </Link>
      </div>

      {/* ========================================================================= */}
      {/* 2. Key Demand Metrics                                                     */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Total Guest Searches"
          value={totalSearches.toLocaleString()}
          icon={<Search className="size-5" />}
          tone="burgundy"
          trend={{ value: `${totalSearches} total`, isPositive: true }}
          subtitle="Real traveler intent"
        />

        <MetricCard
          label="Unmatched Shortages"
          value={totalUnmatched.toLocaleString()}
          icon={<AlertTriangle className="size-5" />}
          tone="rose"
          trend={{
            value: `${totalUnmatched} zero-result searches`,
            isPositive: false,
          }}
          subtitle="Direct revenue loss / supply gap"
        />

        <MetricCard
          label="Critical Supply Gaps"
          value={criticalGapsCount.toLocaleString()}
          icon={<MapPin className="size-5" />}
          tone="amber"
          trend={{
            value: `${destinationGaps.length} destinations monitored`,
            isNeutral: true,
          }}
          subtitle="Areas needing immediate host recruitment"
        />

        <MetricCard
          label="Supply Fulfillment Rate"
          value={`${fulfillmentRate}%`}
          icon={<CheckCircle2 className="size-5" />}
          tone="emerald"
          trend={{
            value: `${fulfillmentRate}% satisfied`,
            isPositive: fulfillmentRate >= 70,
          }}
          subtitle="Guests finding matching stays"
        />
      </div>

      {/* ========================================================================= */}
      {/* 3. Destination Supply-Gap Breakdown (Section 8: Where supply is needed)   */}
      {/* ========================================================================= */}
      <div className="rounded-3xl border border-stone-200/90 bg-white p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-stone-100 pb-4">
          <div>
            <h3 className="font-brand text-xl font-bold text-[#181113]">
              Where does Beddn have demand but not enough supply?
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              Aggregated guest searches vs available verified listings per location.
            </p>
          </div>
          <span className="text-xs text-stone-400 font-mono">
            {destinationGaps.length} active destinations
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-stone-200/80 text-[11px] font-bold uppercase tracking-wider text-stone-400">
                <th className="pb-3 pl-2">Destination / Area</th>
                <th className="pb-3 text-center">Guest Searches</th>
                <th className="pb-3 text-center">Unmatched (0 results)</th>
                <th className="pb-3 text-center">Active Listings</th>
                <th className="pb-3 text-center">Supply Gap Status</th>
                <th className="pb-3 text-right pr-2">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 font-medium">
              {destinationGaps.slice(0, 15).map((gap, idx) => (
                <tr key={idx} className="hover:bg-[#fcfafb] transition">
                  <td className="py-3.5 pl-2">
                    <div className="flex items-center gap-2.5">
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-[#fdf2f4] text-[#800020]">
                        <MapPin className="size-4" />
                      </div>
                      <span className="font-bold text-sm text-stone-900">{gap.destination}</span>
                    </div>
                  </td>
                  <td className="py-3.5 text-center font-mono font-bold text-stone-800">
                    {gap.totalSearches}
                  </td>
                  <td className="py-3.5 text-center font-mono font-bold text-rose-600">
                    {gap.unmatchedSearches}
                  </td>
                  <td className="py-3.5 text-center font-mono font-semibold text-stone-700">
                    {gap.matchingListings}
                  </td>
                  <td className="py-3.5 text-center">
                    {gap.gapLevel === "critical" ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-[11px] font-bold text-rose-700 border border-rose-200">
                        <AlertTriangle className="size-3" /> Critical Gap
                      </span>
                    ) : gap.gapLevel === "moderate" ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold text-amber-700 border border-amber-200">
                        Moderate Gap
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="size-3" /> Well Supplied
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 text-right pr-2">
                    <Link
                      href={`${ROUTES.adminHosts}?city=${encodeURIComponent(gap.destination)}`}
                      className="inline-flex h-7 items-center rounded-full bg-stone-100 px-3 text-[11px] font-bold text-stone-700 hover:bg-[#800020] hover:text-white transition shadow-2xs"
                    >
                      Recruit Hosts
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. Live Guest Demand Feed (What are guests looking for?)                  */}
      {/* ========================================================================= */}
      <div className="rounded-3xl border border-stone-200/90 bg-white p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-stone-100 pb-4">
          <div>
            <h3 className="font-brand text-xl font-bold text-[#181113]">
              What are guests currently looking for?
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              Live guest search inquiries, dates, group sizes, and category requests.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center rounded-full border border-stone-200/80 bg-stone-50 p-1">
              <button
                type="button"
                onClick={() => setFilterMode("all")}
                className={`rounded-full px-3 py-1 text-xs font-bold transition ${
                  filterMode === "all" ? "bg-[#800020] text-white" : "text-stone-600"
                }`}
              >
                All Searches
              </button>
              <button
                type="button"
                onClick={() => setFilterMode("unmatched")}
                className={`rounded-full px-3 py-1 text-xs font-bold transition ${
                  filterMode === "unmatched" ? "bg-[#800020] text-white" : "text-stone-600"
                }`}
              >
                Supply Shortages Only
              </button>
              <button
                type="button"
                onClick={() => setFilterMode("with_dates")}
                className={`rounded-full px-3 py-1 text-xs font-bold transition ${
                  filterMode === "with_dates" ? "bg-[#800020] text-white" : "text-stone-600"
                }`}
              >
                With Dates
              </button>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-2.5 size-3.5 text-stone-400" />
              <Input
                placeholder="Filter destination..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8.5 w-44 rounded-full pl-8 text-xs border-stone-200"
              />
            </div>
          </div>
        </div>

        <div className="divide-y divide-stone-100">
          {filteredEntries.length === 0 ? (
            <div className="py-12 text-center text-stone-400 text-xs">
              No demand entries matching the current filter.
            </div>
          ) : (
            filteredEntries.slice(0, 30).map((entry) => (
              <div key={entry.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-start sm:items-center gap-3">
                  <div
                    className={`flex size-8 shrink-0 items-center justify-center rounded-xl font-bold ${
                      entry.results_count === 0 || entry.status === "unmatched"
                        ? "bg-rose-50 text-rose-700 border border-rose-200"
                        : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    }`}
                  >
                    <Search className="size-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-stone-900">
                        {entry.query || "Local Area Search"}
                      </span>
                      {entry.category && (
                        <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-stone-600">
                          {entry.category}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-stone-500 mt-0.5">
                      {entry.check_in && (
                        <span className="flex items-center gap-1">
                          <Calendar className="size-3 text-stone-400" />
                          {entry.check_in} {entry.check_out ? `→ ${entry.check_out}` : ""}
                        </span>
                      )}
                      {entry.guests && (
                        <span className="flex items-center gap-1">
                          <Users className="size-3 text-stone-400" />
                          {entry.guests} guest{entry.guests > 1 ? "s" : ""}
                        </span>
                      )}
                      {entry.property_type && (
                        <span className="flex items-center gap-1">
                          <Building2 className="size-3 text-stone-400" />
                          {entry.property_type}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 self-end sm:self-center">
                  <span
                    className={`rounded-full px-2.5 py-0.5 font-bold text-[11px] ${
                      entry.results_count === 0 || entry.status === "unmatched"
                        ? "bg-rose-50 text-rose-700 border border-rose-200"
                        : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    }`}
                  >
                    {entry.results_count === 0 || entry.status === "unmatched"
                      ? "0 Results · Unmatched Gap"
                      : `${entry.results_count} Matching Stays`}
                  </span>

                  <span className="font-mono text-[10px] text-stone-400">
                    {new Date(entry.created_at).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
