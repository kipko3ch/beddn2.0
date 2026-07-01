"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/empty-state";
import { DashboardListSkeleton } from "@/components/dashboard-skeletons";
import { Icon } from "@/components/icon";
import type { Listing } from "@/lib/types";

const STATUS_TEXT: Record<string, string> = {
  draft: "Draft",
  pending_review: "Pending review",
  active: "Active",
  paused: "On hold",
  rejected: "Rejected",
  archived: "Archived",
};

const STATUS_BADGE: Record<string, string> = {
  draft: "bg-amber-100 text-amber-800 hover:bg-amber-100",
  pending_review: "bg-amber-100 text-amber-800 hover:bg-amber-100",
  active: "bg-green-100 text-green-800 hover:bg-green-100",
  paused: "bg-slate-200 text-slate-700 hover:bg-slate-200",
  rejected: "bg-red-100 text-red-800 hover:bg-red-100",
  archived: "bg-zinc-200 text-zinc-600 hover:bg-zinc-200",
};

type Tab = "stays" | "experiences";
type StatusTarget = "active" | "paused" | "archived";

function effectiveStatus(listing: Listing): string {
  return listing.listing_status ?? (listing.is_active ? "active" : "draft");
}

function isExperience(listing: Listing): boolean {
  const cats = (listing.categories || listing.category || []) as string[];
  return cats.includes("experience") && !cats.includes("hourly") && !cats.includes("overnight");
}

export default function ListingsPage() {
  const supabase = useMemo(() => createClient(), []);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("stays");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function copyReviewLink(slug: string, id: string) {
    const url = `${window.location.origin}/review?listing=${slug}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(id);
      setTimeout(() => setCopiedId((c) => (c === id ? null : c)), 2000);
    } catch {
      /* ignore */
    }
  }

  async function load() {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      setLoading(false);
      return;
    }
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.user.id)
      .maybeSingle();

    let query = supabase
      .from("listings")
      .select("*, listing_images(*), host:hosts(name)")
      .order("created_at", { ascending: false });

    if (!profile?.is_admin) {
      const { data: host } = await supabase
        .from("hosts")
        .select("id")
        .eq("user_id", user.user.id)
        .maybeSingle();
      if (host) {
        query = query.eq("host_id", host.id);
      } else {
        setListings([]);
        setLoading(false);
        return;
      }
    }

    const { data } = await query;
    setListings((data as Listing[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function changeStatus(id: string, status: StatusTarget) {
    setBusyId(id);
    const prev = listings;
    // Optimistic update.
    setListings((cur) =>
      cur.map((l) =>
        l.id === id ? { ...l, listing_status: status, is_active: status === "active" } : l
      )
    );
    const res = await fetch(`/api/listings/${id}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setBusyId(null);
    if (!res.ok) {
      setListings(prev); // revert
      alert("Could not update the listing. Please try again.");
    }
  }

  const stays = listings.filter((l) => !isExperience(l));
  const experiences = listings.filter((l) => isExperience(l));
  const rows = tab === "stays" ? stays : experiences;

  const addHref = tab === "experiences" ? "/host/listings/new?type=experience" : "/host/listings/new";
  const addLabel = tab === "experiences" ? "Add experience" : "Add stay";

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-brand text-3xl text-[#2b000a]">Listings</h1>
        <Link href={addHref}>
          <Button className="gap-1 rounded-full bg-[#800020] hover:bg-[#600018]">
            <Icon icon="line-md:plus" className="h-4 w-4" /> {addLabel}
          </Button>
        </Link>
      </div>

      {/* Stays / Experiences tabs */}
      <div className="mb-5 inline-flex rounded-full border bg-white p-1 text-sm font-semibold">
        {(["stays", "experiences"] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-full px-4 py-1.5 capitalize transition-colors ${
              tab === t ? "bg-[#800020] text-white" : "text-[#6f6568] hover:text-[#2b000a]"
            }`}
          >
            {t === "stays" ? `Stays (${stays.length})` : `Experiences (${experiences.length})`}
          </button>
        ))}
      </div>

      {loading ? (
        <DashboardListSkeleton rows={4} />
      ) : rows.length === 0 ? (
        <EmptyState
          image="https://res.cloudinary.com/dzjhuss7i/image/upload/v1781029372/empty-listings_xklz7s.png"
          title={tab === "experiences" ? "No experiences yet" : "No stays yet"}
          subtitle={
            tab === "experiences"
              ? "Add an experience — a tour, class, or activity guests can book."
              : "Create your first stay to start receiving booking requests."
          }
          size="sm"
        />
      ) : (
        <div className="space-y-3">
          {rows.map((listing) => {
            const status = effectiveStatus(listing);
            return (
              <div key={listing.id} className="rounded-2xl border bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-[#2b000a]">{listing.title || listing.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {listing.area}, {listing.city}
                    </p>
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      <Badge className={`text-xs ${STATUS_BADGE[status] ?? "bg-muted text-muted-foreground"}`}>
                        {STATUS_TEXT[status] ?? status}
                      </Badge>
                      <Badge variant={listing.is_verified ? "default" : "outline"} className="text-xs">
                        {listing.is_verified ? "Verified" : "Badge pending"}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1"
                      onClick={() => copyReviewLink(listing.slug, listing.id)}
                      title="Copy a link guests can use to review this stay"
                    >
                      {copiedId === listing.id ? (
                        <Icon icon="line-md:check-all" className="h-4 w-4 text-[#128c4b]" />
                      ) : (
                        <Icon icon="line-md:star" className="h-4 w-4" />
                      )}
                      <span className="hidden text-xs font-medium sm:inline">
                        {copiedId === listing.id ? "Copied" : "Review link"}
                      </span>
                    </Button>
                    <a
                      href={`/property/${listing.slug}${listing.is_active ? "" : "?preview=1"}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button variant="ghost" size="sm" className="gap-1">
                        <Icon icon="line-md:search" className="h-4 w-4" />
                        <span className="hidden text-xs font-medium sm:inline">
                          {listing.is_active ? "View" : "Preview"}
                        </span>
                      </Button>
                    </a>
                    <Link href={`/host/listings/${listing.id}/edit`}>
                      <Button variant="ghost" size="sm" className="gap-1">
                        <Icon icon="line-md:briefcase" className="h-4 w-4" />
                        <span className="hidden text-xs font-medium sm:inline">Edit</span>
                      </Button>
                    </Link>
                  </div>
                </div>

                {/* Lifecycle controls — clear, one tap each */}
                {status !== "draft" && status !== "pending_review" && status !== "rejected" && (
                  <div className="mt-3 flex flex-wrap items-center gap-2 border-t pt-3">
                    <span className="text-xs font-semibold text-muted-foreground">Availability:</span>
                    {(
                      [
                        { key: "active", label: "Active", icon: "line-md:check-all" },
                        { key: "paused", label: "On hold", icon: "line-md:pause" },
                        { key: "archived", label: "Archived", icon: "line-md:remove" },
                      ] as { key: StatusTarget; label: string; icon: string }[]
                    ).map(({ key, label, icon }) => (
                      <button
                        key={key}
                        type="button"
                        disabled={busyId === listing.id || status === key}
                        onClick={() => changeStatus(listing.id, key)}
                        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-colors disabled:opacity-100 ${
                          status === key
                            ? "border-[#800020] bg-[#800020] text-white"
                            : "border-[#e3d3d9] bg-white text-[#2b000a] hover:bg-muted disabled:opacity-50"
                        }`}
                      >
                        <Icon icon={icon} className="h-3.5 w-3.5" /> {label}
                      </button>
                    ))}
                  </div>
                )}

                {status === "draft" && (
                  <div className="mt-3 border-t pt-3">
                    <Link href={`/host/listings/${listing.id}/edit`}>
                      <Button size="sm" className="rounded-full bg-[#800020] hover:bg-[#600018]">
                        Continue setup
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
