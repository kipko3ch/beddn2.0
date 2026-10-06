"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { DashboardTableSkeleton } from "@/components/dashboard-skeletons";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Icon } from "@iconify/react";
import {
  BadgeCheck,
  CheckCircle2,
  Clock,
  ExternalLink,
  Mail,
  ShieldAlert,
  Sparkles,
  XCircle,
} from "lucide-react";
import type { ListingClaim, ClaimStatus } from "@/lib/types";

interface EnrichedClaim extends Omit<ListingClaim, "listing" | "claimant"> {
  listing?: {
    id: string;
    slug: string;
    name: string;
    title: string;
    city: string;
    area: string;
    ownership_state: string;
    private_owner_name?: string;
    private_owner_email?: string;
  };
  claimant?: {
    id: string;
    email?: string;
    full_name?: string;
    phone?: string;
  };
}

const STATUS_BADGE: Record<ClaimStatus, { bg: string; text: string; label: string }> = {
  pending: { bg: "bg-amber-100 border-amber-200", text: "text-amber-800", label: "Pending Review" },
  approved: { bg: "bg-emerald-100 border-emerald-200", text: "text-emerald-800", label: "Approved" },
  rejected: { bg: "bg-rose-100 border-rose-200", text: "text-rose-800", label: "Rejected" },
  withdrawn: { bg: "bg-stone-100 border-stone-200", text: "text-stone-600", label: "Withdrawn" },
};

const RELATIONSHIP_LABEL: Record<string, string> = {
  owner: "Property Owner",
  manager: "Property Manager",
  caretaker: "Caretaker / Agent",
};

export default function AdminClaimsPage() {
  const supabase = createClient();
  const [claims, setClaims] = useState<EnrichedClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");

  // Approval modal state
  const [approvingClaim, setApprovingClaim] = useState<EnrichedClaim | null>(null);
  const [actionBusy, setActionBusy] = useState(false);

  // Rejection modal state
  const [rejectingClaim, setRejectingClaim] = useState<EnrichedClaim | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [rejectError, setRejectError] = useState("");

  async function loadClaims() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/claims?status=${statusFilter}`);
      if (res.status === 403) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setClaims(data.claims || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadClaims();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  async function handleApprove() {
    if (!approvingClaim) return;
    setActionBusy(true);
    try {
      const res = await fetch(`/api/admin/claims/${approvingClaim.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve" }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to approve claim.");
        setActionBusy(false);
        return;
      }
      setApprovingClaim(null);
      await loadClaims();
    } catch {
      alert("Network error approving claim.");
    } finally {
      setActionBusy(false);
    }
  }

  async function handleReject() {
    if (!rejectingClaim) return;
    if (!rejectionReason.trim()) {
      setRejectError("Please provide a reason for rejection.");
      return;
    }
    setActionBusy(true);
    setRejectError("");
    try {
      const res = await fetch(`/api/admin/claims/${rejectingClaim.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject", reason: rejectionReason.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setRejectError(data.error || "Failed to reject claim.");
        setActionBusy(false);
        return;
      }
      setRejectingClaim(null);
      setRejectionReason("");
      await loadClaims();
    } catch {
      setRejectError("Network error rejecting claim.");
    } finally {
      setActionBusy(false);
    }
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <ShieldAlert className="mx-auto h-12 w-12 text-crimson" />
        <h2 className="mt-4 text-xl font-bold">Admin Access Required</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          You do not have permission to view host listing claims.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-brand text-3xl text-[#2b000a]">Listing Claims</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Review host ownership claims on &quot;Hosted by Beddn&quot; listings. Approving a claim transfers
          ownership, clears Beddn support contact phone, and notifies the host.
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="inline-flex rounded-full border bg-white p-1 text-xs font-semibold shadow-2xs">
        {(["pending", "approved", "rejected", "all"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setStatusFilter(tab)}
            className={`rounded-full px-4 py-1.5 capitalize transition-colors ${
              statusFilter === tab
                ? "bg-[#800020] text-white shadow-xs"
                : "text-stone-600 hover:text-stone-900"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {loading ? (
        <DashboardTableSkeleton />
      ) : claims.length === 0 ? (
        <EmptyState
          image="https://res.cloudinary.com/dzjhuss7i/image/upload/v1781029363/empty-admin_ypowli.png"
          title={`No ${statusFilter === "all" ? "" : statusFilter} claims found`}
          subtitle="Claims submitted by property owners on Beddn will appear here for review."
          size="sm"
        />
      ) : (
        <div className="space-y-4">
          {claims.map((claim) => {
            const badge = STATUS_BADGE[claim.status] || STATUS_BADGE.pending;
            const listingTitle = claim.listing?.title || claim.listing?.name || "Listing #" + claim.listing_id.slice(0, 8);
            const claimantEmail = claim.claimant?.email || "—";
            const dateStr = new Date(claim.created_at).toLocaleDateString(undefined, {
              year: "numeric",
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            });

            return (
              <div
                key={claim.id}
                className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs transition hover:border-stone-300"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2.5 max-w-2xl">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full border px-2.5 py-0.5 text-xs font-bold ${badge.bg} ${badge.text}`}
                      >
                        {badge.label}
                      </span>

                      {claim.email_verified ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                          <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                          Email Verified
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                          <Clock className="h-3 w-3 text-amber-600" />
                          Email Unverified
                        </span>
                      )}

                      {claim.email_matches_owner && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-purple-200 bg-purple-50 px-2.5 py-0.5 text-xs font-bold text-purple-900 shadow-2xs">
                          <Sparkles className="h-3.5 w-3.5 text-purple-600 fill-purple-100" />
                          Strong Match (Matches Private Owner Email)
                        </span>
                      )}
                    </div>

                    {/* Listing Title & Link */}
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-base font-bold text-stone-900">{listingTitle}</h2>
                        {claim.listing?.slug && (
                          <Link
                            href={`/property/${claim.listing.slug}`}
                            target="_blank"
                            className="text-stone-400 hover:text-stone-700 transition"
                            title="View public listing"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Link>
                        )}
                      </div>
                      <p className="text-xs text-stone-500">
                        {claim.listing?.area ? `${claim.listing.area}, ` : ""}
                        {claim.listing?.city} · Ownership state:{" "}
                        <span className="font-semibold">{claim.listing?.ownership_state}</span>
                      </p>
                    </div>

                    {/* Claimant Info Card */}
                    <div className="rounded-xl border border-stone-100 bg-stone-50/70 p-3 text-xs text-stone-700 space-y-1">
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                        <div>
                          <span className="font-bold text-stone-900">Claimant:</span>{" "}
                          {claim.full_name}
                        </div>
                        <div>
                          <span className="font-bold text-stone-900">Email:</span>{" "}
                          <span className="font-mono">{claimantEmail}</span>
                        </div>
                        <div>
                          <span className="font-bold text-stone-900">Role:</span>{" "}
                          {RELATIONSHIP_LABEL[claim.relationship] || claim.relationship}
                        </div>
                      </div>

                      {claim.message && (
                        <div className="pt-2 mt-2 border-t border-stone-200/70">
                          <span className="font-bold text-stone-900">Claimant note:</span>
                          <p className="mt-0.5 text-stone-600 italic">
                            &quot;{claim.message}&quot;
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Rejection reason notice if rejected */}
                    {claim.status === "rejected" && claim.rejection_reason && (
                      <div className="rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-800">
                        <span className="font-bold">Rejection reason:</span> {claim.rejection_reason}
                      </div>
                    )}

                    <p className="text-[11px] text-stone-400">
                      Submitted on {dateStr}
                    </p>
                  </div>

                  {/* Actions Column */}
                  <div className="flex shrink-0 flex-wrap items-center gap-2 lg:flex-col lg:items-end">
                    {claim.status === "pending" && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => setApprovingClaim(claim)}
                          className="h-9 rounded-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-4"
                        >
                          <CheckCircle2 className="mr-1.5 h-4 w-4" />
                          Approve claim
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setRejectingClaim(claim);
                            setRejectionReason("");
                            setRejectError("");
                          }}
                          className="h-9 rounded-full border-rose-300 text-rose-700 hover:bg-rose-50 px-4"
                        >
                          <XCircle className="mr-1.5 h-4 w-4" />
                          Reject
                        </Button>
                      </>
                    )}

                    {claim.listing?.id && (
                      <Link href={`/admin/listings/${claim.listing.id}`}>
                        <Button size="sm" variant="outline" className="h-9 rounded-full text-xs">
                          Edit listing
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Approve Confirmation Dialog */}
      <Dialog open={Boolean(approvingClaim)} onOpenChange={(open) => !open && setApprovingClaim(null)}>
        <DialogContent className="sm:max-w-md rounded-3xl bg-white p-6 border border-[#f3cfd9]">
          <DialogHeader>
            <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 mb-2">
              <CheckCircle2 className="size-6" />
            </div>
            <DialogTitle className="text-center font-brand text-xl text-[#2b000a]">
              Approve Listing Ownership Claim?
            </DialogTitle>
            <DialogDescription className="text-center text-xs text-stone-600 leading-relaxed pt-2">
              You are about to transfer ownership of{" "}
              <strong>
                &quot;{approvingClaim?.listing?.title || approvingClaim?.listing?.name}&quot;
              </strong>{" "}
              to <strong>{approvingClaim?.full_name}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-2xl border border-stone-200 bg-stone-50 p-3 text-xs text-stone-700 space-y-1.5 my-3">
            <p className="font-semibold text-stone-900">What happens on approval:</p>
            <ul className="list-disc pl-4 space-y-1 text-stone-600 text-[11px]">
              <li>Listing owner will be set to {approvingClaim?.full_name} and ownership state to <strong>owned</strong>.</li>
              <li>Beddn public support contact phone and name will be removed so guest inquiries go directly to the host.</li>
              <li>Any other pending claims on this listing will be automatically rejected.</li>
              <li>The claimant will receive an email confirmation with a direct link to manage the listing.</li>
            </ul>
          </div>

          <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setApprovingClaim(null)}
              disabled={actionBusy}
              className="rounded-full"
            >
              Cancel
            </Button>
            <Button
              onClick={handleApprove}
              disabled={actionBusy}
              className="rounded-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold"
            >
              {actionBusy ? "Approving…" : "Confirm & Hand Over Listing"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={Boolean(rejectingClaim)} onOpenChange={(open) => !open && setRejectingClaim(null)}>
        <DialogContent className="sm:max-w-md rounded-3xl bg-white p-6 border border-[#f3cfd9]">
          <DialogHeader>
            <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-rose-100 text-rose-700 mb-2">
              <XCircle className="size-6" />
            </div>
            <DialogTitle className="text-center font-brand text-xl text-[#2b000a]">
              Reject Claim
            </DialogTitle>
            <DialogDescription className="text-center text-xs text-stone-600 leading-relaxed pt-1">
              Please provide a polite reason for rejecting {rejectingClaim?.full_name}&apos;s claim.
              This reason will be emailed to the claimant.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 my-2">
            <label htmlFor="rejection-reason" className="text-xs font-bold text-stone-800">
              Rejection Reason <span className="text-rose-600">*</span>
            </label>
            <Textarea
              id="rejection-reason"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g. Unable to verify proof of ownership or authorization. Please contact support with documentation."
              rows={3}
              className="text-xs"
            />
            {rejectError && (
              <p className="text-xs text-rose-600 font-medium">{rejectError}</p>
            )}
          </div>

          <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setRejectingClaim(null)}
              disabled={actionBusy}
              className="rounded-full"
            >
              Cancel
            </Button>
            <Button
              onClick={handleReject}
              disabled={actionBusy || !rejectionReason.trim()}
              className="rounded-full bg-rose-700 hover:bg-rose-800 text-white font-bold"
            >
              {actionBusy ? "Rejecting…" : "Reject Claim"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
