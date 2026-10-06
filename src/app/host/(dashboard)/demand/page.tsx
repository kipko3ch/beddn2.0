"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ROUTES } from "@/lib/routes";
import Image from "next/image";
import { Icon } from "@iconify/react";
import { Badge } from "@/components/ui/badge";

interface DemandEntry {
  id: string;
  query: string | null;
  latitude: number | null;
  longitude: number | null;
  category: string | null;
  results_count: number;
  created_at: string;
}

interface AreaStat {
  query: string;
  count: number;
  no_results: number;
}

interface HostDemandResponse {
  listings?: { id: string; name?: string; title?: string; city?: string; area?: string }[];
  hostAreas?: string[];
  localDemand?: DemandEntry[];
  unmatchedNearYou?: DemandEntry[];
  topAreas?: AreaStat[];
  categoryStats?: { name: string; count: number }[];
}

export default function DemandPage() {
  const [data, setData] = useState<HostDemandResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/host/demand");
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch (err) {
        console.error("Failed to load host demand:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-64 bg-stone-200 rounded-lg" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 rounded-2xl bg-stone-100" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-72 rounded-2xl bg-stone-100" />
          <div className="h-72 rounded-2xl bg-stone-100" />
        </div>
      </div>
    );
  }

  const listings = data?.listings || [];
  const hostAreas = data?.hostAreas || [];
  const localDemand = data?.localDemand || [];
  const unmatchedNearYou = data?.unmatchedNearYou || [];
  const topAreas = data?.topAreas || [];
  const categoryStats = data?.categoryStats || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-brand text-2xl sm:text-3xl font-extrabold text-[#2b000a] tracking-tight">
            Marketplace Demand & Search Intelligence
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-stone-500">
            Real guest search behavior to help you optimize listing visibility and capture bookings.
          </p>
        </div>

        {hostAreas.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-semibold text-stone-500">Your areas:</span>
            {hostAreas.map((area) => (
              <span
                key={area}
                className="inline-flex items-center gap-1 rounded-full bg-[#fdf2f4] px-2.5 py-0.5 text-xs font-bold text-[#800020] border border-[#f9c8d4]/70"
              >
                <Icon icon="solar:map-point-bold-duotone" className="size-3" />
                {area}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* KPI Cards (2x2 on mobile, 4 cols on desktop) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1 */}
        <div className="rounded-2xl border border-stone-200/80 bg-white p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between text-stone-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Demand Near You</span>
            <div className="flex size-7 items-center justify-center rounded-lg bg-[#fdf2f4] text-[#800020]">
              <Icon icon="solar:compass-bold-duotone" className="size-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-brand font-black text-[#2b000a]">
            {localDemand.length}
          </div>
          <p className="mt-1 text-[11px] text-stone-500 truncate">
            Guest searches matching your area
          </p>
        </div>

        {/* Card 2 */}
        <div className="rounded-2xl border border-stone-200/80 bg-white p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between text-stone-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Unmatched Searches</span>
            <div className="flex size-7 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
              <Icon icon="solar:flame-bold-duotone" className="size-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-brand font-black text-rose-600">
            {unmatchedNearYou.length}
          </div>
          <p className="mt-1 text-[11px] text-stone-500 truncate">
            Zero-result shortages near you
          </p>
        </div>

        {/* Card 3 */}
        <div className="rounded-2xl border border-stone-200/80 bg-white p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between text-stone-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Top Search Intent</span>
            <div className="flex size-7 items-center justify-center rounded-lg bg-[#fdf2f4] text-[#800020]">
              <Icon icon="solar:bolt-bold-duotone" className="size-4" />
            </div>
          </div>
          <div className="mt-2 text-xl sm:text-2xl font-brand font-bold text-[#2b000a] capitalize truncate">
            {categoryStats[0]?.name || "BnB Stays"}
          </div>
          <p className="mt-1 text-[11px] text-stone-500 truncate">
            Most popular requested category
          </p>
        </div>

        {/* Card 4 */}
        <div className="rounded-2xl border border-stone-200/80 bg-white p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between text-stone-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Your Coverage</span>
            <div className="flex size-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <Icon icon="solar:map-point-bold-duotone" className="size-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-brand font-black text-[#2b000a]">
            {listings.length}
          </div>
          <p className="mt-1 text-[11px] text-stone-500 truncate">
            Active properties listed
          </p>
        </div>
      </div>

      {/* Main 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Column 1: Searches Near Your Properties (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="rounded-3xl border border-stone-200/80 bg-white p-5 sm:p-6 shadow-xs">
            <div className="flex items-center justify-between border-b border-stone-100 pb-4">
              <div>
                <h3 className="font-brand font-bold text-base text-stone-900 flex items-center gap-2">
                  <Icon icon="solar:map-point-bold-duotone" className="size-4 text-[#800020]" />
                  What People Search Near You
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  Guest search queries recorded in your active cities and neighborhoods.
                </p>
              </div>
              <Badge variant="outline" className="border-[#f9c8d4] text-[#800020] bg-[#fdf2f4]/60">
                {localDemand.length} recorded
              </Badge>
            </div>

            {listings.length === 0 ? (
              <div className="py-10 text-center">
                <Image
                  src="/images/empty-demand.png"
                  alt="No properties listed yet"
                  width={140}
                  height={140}
                  className="mx-auto mb-3 object-contain"
                />
                <p className="font-bold text-sm text-stone-800">No properties listed yet</p>
                <p className="text-xs text-stone-400 mt-1 max-w-sm mx-auto">
                  Add your BnB or short stay property to unlock localized search demand tailored to your area.
                </p>
                <Link
                  href={ROUTES.newListing}
                  className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-[#800020] px-4 py-2 text-xs font-bold text-white hover:bg-[#68001a] transition"
                >
                  <Icon icon="solar:add-circle-linear" className="size-3.5" />
                  <span>Add your first property</span>
                </Link>
              </div>
            ) : localDemand.length === 0 ? (
              <div className="py-10 text-center">
                <Image
                  src="/images/empty-demand.png"
                  alt="No searches yet"
                  width={120}
                  height={120}
                  className="mx-auto mb-3 object-contain"
                />
                <p className="font-bold text-sm text-stone-800">No direct searches in your exact zone yet</p>
                <p className="text-xs text-stone-400 mt-1 max-w-sm mx-auto">
                  As travelers search for stays in {hostAreas.join(", ") || "your area"}, queries will appear here in real-time.
                </p>
              </div>
            ) : (
              <div className="mt-4 divide-y divide-stone-100 max-h-[420px] overflow-y-auto pr-1">
                {localDemand.map((item) => (
                  <div key={item.id} className="py-3 flex items-center justify-between text-xs gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-stone-900">{item.query}</span>
                        {item.category && (
                          <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-semibold text-stone-600 capitalize">
                            {item.category}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-stone-400 mt-0.5">
                        {new Date(item.created_at).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      {item.results_count === 0 ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 border border-rose-200 px-2 py-0.5 text-[11px] font-bold text-rose-700">
                          <Icon icon="solar:flame-bold-duotone" className="size-3" />
                          0 matches (Opportunity!)
                        </span>
                      ) : (
                        <span className="text-stone-500 font-medium text-xs">
                          {item.results_count} listings found
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actionable Insights Banner */}
          <div className="rounded-3xl border border-[#f9c8d4]/90 bg-[#fdf2f4]/60 p-5 text-xs text-[#2b000a] space-y-3">
            <div className="flex items-center gap-2 font-brand font-bold text-sm text-[#800020]">
              <Icon icon="solar:lightbulb-bolt-bold-duotone" className="size-4" />
              <span>How to Use Search Demand to Grow Your Bookings</span>
            </div>
            <ul className="space-y-2 text-stone-700 leading-relaxed list-disc list-inside">
              <li>
                <span className="font-semibold text-stone-900">Zero-match searches:</span> When travelers search your area with 0 results, it means demand exceeds supply. Ensure your calendar has open dates.
              </li>
              <li>
                <span className="font-semibold text-stone-900">Hourly vs Overnight:</span> If guests frequently search for hourly stays near you, consider enabling flexible hourly rates on your listings.
              </li>
              <li>
                <span className="font-semibold text-stone-900">Instant Bookings:</span> Listings with Instant Booking convert 3.4x faster for travelers looking for quick check-ins.
              </li>
            </ul>
          </div>
        </div>

        {/* Column 2: Regional Market Activity (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-3xl border border-stone-200/80 bg-white p-5 sm:p-6 shadow-xs">
            <div className="flex items-center justify-between border-b border-stone-100 pb-4">
              <div>
                <h3 className="font-brand font-bold text-base text-stone-900 flex items-center gap-2">
                  <Icon icon="solar:graph-up-bold-duotone" className="size-4 text-[#800020]" />
                  Top Search Destinations
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  Most searched travel destinations across Kenya & Tanzania.
                </p>
              </div>
            </div>

            {topAreas.length === 0 ? (
              <div className="py-10 text-center text-xs text-stone-400">
                No marketplace searches recorded yet.
              </div>
            ) : (
              <div className="mt-4 divide-y divide-stone-100">
                {topAreas.map((area) => (
                  <div key={area.query} className="py-3 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5">
                      <div className="flex size-7 items-center justify-center rounded-lg bg-stone-100 text-stone-600 font-bold">
                        <Icon icon="solar:map-point-bold-duotone" className="size-3.5" />
                      </div>
                      <div>
                        <p className="font-bold text-stone-900">{area.query}</p>
                        <p className="text-[11px] text-stone-400">{area.count} total searches</p>
                      </div>
                    </div>

                    <div className="text-right">
                      {area.no_results > 0 ? (
                        <span className="font-mono text-rose-600 font-bold text-xs">
                          {area.no_results} shortage{area.no_results > 1 ? "s" : ""}
                        </span>
                      ) : (
                        <span className="text-emerald-700 font-semibold text-xs">Well supplied</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
