"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { DashboardTableSkeleton } from "@/components/dashboard-skeletons";
import { FeatureListingDialog } from "@/components/admin/feature-listing-dialog";
import type { Listing, ListingStatus } from "@/lib/types";

type ListingRow = Listing & { host?: { name?: string | null } | null };

const STATUS_STYLES: Record<string, string> = {
  active: "bg-green-100 text-green-800",
  pending_review: "bg-amber-100 text-amber-800",
  paused: "bg-slate-200 text-slate-700",
  rejected: "bg-red-100 text-red-800",
  archived: "bg-zinc-200 text-zinc-600",
  draft: "border border-amber-300 text-amber-700",
};

const STATUS_LABEL: Record<string, string> = {
  active: "Active",
  pending_review: "Pending review",
  paused: "Paused",
  rejected: "Rejected",
  archived: "Archived",
  draft: "Draft",
};

function statusOf(listing: ListingRow): ListingStatus {
  return (listing.listing_status as ListingStatus) || (listing.is_active ? "active" : "draft");
}

function categoryLabel(listing: ListingRow) {
  const cats = listing.categories?.length ? listing.categories : listing.category || [];
  const parts: string[] = [...cats];
  if (listing.property_type) parts.push(listing.property_type);
  return parts.join(" · ") || "—";
}

function formatDate(value?: string) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function AdminListingsPage() {
  const supabase = createClient();
  const [listings, setListings] = useState<ListingRow[]>([]);
  const [featured, setFeatured] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [tab, setTab] = useState<"stays" | "experiences">("stays");

  const stays = listings.filter((l) => {
    const cats = l.categories || l.category || [];
    return !cats.includes("experience");
  });
  const experiences = listings.filter((l) => {
    const cats = l.categories || l.category || [];
    return cats.includes("experience");
  });
  const displayedListings = tab === "stays" ? stays : experiences;

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("listings")
      .select("*, listing_images(id, url, position), host:hosts(name)")
      .order("updated_at", { ascending: false })
      .limit(200);
    const rows = (data as ListingRow[]) ?? [];
    setListings(rows);

    if (rows.length) {
      const { data: placements } = await supabase
        .from("featured_listings")
        .select("listing_id, placement_type, status")
        .in("listing_id", rows.map((r) => r.id))
        .in("status", ["active", "scheduled"]);
      const map = new Map<string, string>();
      for (const p of (placements ?? []) as { listing_id: string; placement_type: string }[]) {
        if (!map.has(p.listing_id)) map.set(p.listing_id, p.placement_type);
      }
      setFeatured(map);
    } else {
      setFeatured(new Map());
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function act(action: string, id: string, reason?: string) {
    setBusyId(id);
    const response = await fetch("/api/admin/actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, id, reason }),
    });
    setBusyId(null);
    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      alert(data.error || "Action failed.");
      return;
    }
    await load();
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-brand text-3xl text-[#2b000a]">Listings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage each listing&apos;s lifecycle and featured placement. Only active listings are
          visible to the public.
        </p>
      </div>

      {/* Stays / Experiences tabs */}
      <div className="mb-6 inline-flex rounded-full border bg-white p-1 text-sm font-semibold">
        {(["stays", "experiences"] as const).map((t) => (
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
        <DashboardTableSkeleton />
      ) : displayedListings.length === 0 ? (
        <EmptyState
          image="https://res.cloudinary.com/dzjhuss7i/image/upload/v1781029363/empty-admin_ypowli.png"
          title={tab === "experiences" ? "No experiences yet" : "No listings yet"}
          subtitle={
            tab === "experiences"
              ? "Experiences created by hosts will appear here."
              : "Listings will appear here as hosts create them."
          }
          size="sm"
        />
      ) : (
        <div className="space-y-3">
          {displayedListings.map((listing) => {
            const status = statusOf(listing);
            const isPublic = status === "active";
            const featuredPlacement = featured.get(listing.id);
            const busy = busyId === listing.id;
            const isExp = (listing.categories || listing.category || []).includes("experience");
            const previewHref = `${isExp ? "/experience" : "/property"}/${listing.slug}${isPublic ? "" : "?preview=1"}`;

            return (
              <div key={listing.id} className="rounded-2xl border bg-white p-4 sm:p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                          STATUS_STYLES[status] ?? "bg-muted text-muted-foreground"
                        }`}
                      >
                        {STATUS_LABEL[status] ?? status}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          isPublic ? "bg-green-50 text-green-700" : "bg-zinc-100 text-zinc-500"
                        }`}
                      >
                        {isPublic ? "Visible to public" : "Hidden from public"}
                      </span>
                      {listing.is_verified && (
                        <span className="rounded-full bg-[#f8eef2] px-2.5 py-0.5 text-xs font-semibold text-[#800020]">
                          Verified badge
                        </span>
                      )}
                      {featuredPlacement && (
                        <span className="rounded-full bg-[#fff4e5] px-2.5 py-0.5 text-xs font-semibold text-[#9a5b00]">
                          Featured · {featuredPlacement.replace("_", " ")}
                        </span>
                      )}
                    </div>
                    <h2 className="mt-2 truncate text-base font-bold text-[#202124]">
                      {listing.title || listing.name}
                    </h2>
                    <p className="mt-0.5 truncate text-sm text-muted-foreground">
                      {listing.host?.name || "Unknown host"} · {listing.city || "—"} ·{" "}
                      {categoryLabel(listing)}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Updated {formatDate(listing.updated_at)}
                    </p>
                    {status === "rejected" && (
                      <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
                        Rejection reason: {listing.rejection_reason || "No reason recorded."}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 sm:justify-end">
                    {status === "active" && (
                      <>
                        <Button size="sm" variant="outline" disabled={busy} onClick={() => act("pause_listing", listing.id)}>
                          Pause listing
                        </Button>
                        <FeatureListingDialog
                          listingId={listing.id}
                          defaultCity={listing.city || ""}
                          defaultCategory={listing.categories?.[0] || ""}
                          onSaved={load}
                        >
                          <Button size="sm" variant="outline">Feature listing</Button>
                        </FeatureListingDialog>
                        <EditButton id={listing.id} />
                        <ViewButton href={previewHref} label="View public page" />
                        <Button size="sm" variant="outline" disabled={busy} onClick={() => act("archive_listing", listing.id)}>
                          Archive
                        </Button>
                      </>
                    )}

                    {status === "paused" && (
                      <>
                        <Button size="sm" className="bg-[#800020] hover:bg-[#600018]" disabled={busy} onClick={() => act("resume_listing", listing.id)}>
                          Resume listing
                        </Button>
                        <EditButton id={listing.id} />
                        <ViewButton href={previewHref} label="View preview" />
                        <Button size="sm" variant="outline" disabled={busy} onClick={() => act("archive_listing", listing.id)}>
                          Archive
                        </Button>
                      </>
                    )}

                    {(status === "pending_review" || status === "draft") && (
                      <>
                        <Button size="sm" className="bg-[#800020] hover:bg-[#600018]" disabled={busy} onClick={() => act("approve_listing", listing.id)}>
                          Approve
                        </Button>
                        <RejectButton onReject={(reason) => act("reject_listing", listing.id, reason)} disabled={busy} />
                        <ViewButton href={previewHref} label="View preview" />
                      </>
                    )}

                    {status === "rejected" && (
                      <>
                        <Button size="sm" className="bg-[#800020] hover:bg-[#600018]" disabled={busy} onClick={() => act("approve_listing", listing.id)}>
                          Approve
                        </Button>
                        <RejectButton
                          label="Edit rejection reason"
                          defaultReason={listing.rejection_reason || ""}
                          onReject={(reason) => act("reject_listing", listing.id, reason)}
                          disabled={busy}
                        />
                        <Button size="sm" variant="outline" disabled={busy} onClick={() => act("archive_listing", listing.id)}>
                          Archive
                        </Button>
                      </>
                    )}

                    {status === "archived" && (
                      <Button size="sm" className="bg-[#800020] hover:bg-[#600018]" disabled={busy} onClick={() => act("restore_listing", listing.id)}>
                        Restore
                      </Button>
                    )}

                    {status !== "archived" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={busy}
                        onClick={() => act(listing.is_verified ? "unverify_listing" : "verify_listing", listing.id)}
                      >
                        {listing.is_verified ? "Remove badge" : "Grant badge"}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function EditButton({ id }: { id: string }) {
  return (
    <a href={`/host/listings/${id}/edit`} target="_blank" rel="noopener noreferrer">
      <Button size="sm" variant="outline">Edit</Button>
    </a>
  );
}

function ViewButton({ href, label }: { href: string; label: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer">
      <Button size="sm" variant="outline">{label}</Button>
    </a>
  );
}

function RejectButton({
  onReject,
  disabled,
  label = "Reject",
  defaultReason = "",
}: {
  onReject: (reason: string) => void;
  disabled?: boolean;
  label?: string;
  defaultReason?: string;
}) {
  return (
    <Button
      size="sm"
      variant="outline"
      disabled={disabled}
      onClick={() => {
        const reason = window.prompt("Reason for rejection (shown to the host):", defaultReason);
        if (reason !== null) onReject(reason);
      }}
    >
      {label}
    </Button>
  );
}
