"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Building2,
  CalendarCheck,
  CheckCircle2,
  Clock,
  Crown,
  MessageSquare,
  Phone,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  ChevronRight,
  AlertCircle,
  HelpCircle,
  Eye,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ROUTES } from "@/lib/routes";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { VerifiedBadge, PendingVerificationBadge } from "@/components/ui/verified-badge";
import { WhatsAppIcon } from "@/components/whatsapp-icon";
import { DashboardOverviewSkeleton } from "@/components/dashboard-skeletons";

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
  created_at: string;
};

type InquiryItem = {
  id: string;
  status: string;
  created_at: string;
};

export default function HostChecklistPage() {
  const supabase = useMemo(() => createClient(), []);
  const [loading, setLoading] = useState(true);
  const [host, setHost] = useState<HostProfile | null>(null);
  const [listings, setListings] = useState<ListingItem[]>([]);
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [inquiries, setInquiries] = useState<InquiryItem[]>([]);
  const [activeTier, setActiveTier] = useState<string | null>(null);
  const [tierExpiry, setTierExpiry] = useState<string | null>(null);
  const [submittingVerification, setSubmittingVerification] = useState(false);

  useEffect(() => {
    async function loadData() {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) {
        setLoading(false);
        return;
      }

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

      // 2. Fetch listings, bookings, inquiries, pro status
      const [listingsRes, bookingsRes, inquiriesRes, featuredRes] = await Promise.all([
        supabase
          .from("listings")
          .select("id, title, name, city, is_active, is_verified, listing_status, photos, description, price_per_night, hourly_rate")
          .eq("host_id", hostData.id),
        supabase
          .from("bookings")
          .select("id, status, created_at")
          .eq("host_id", hostData.id),
        supabase
          .from("inquiries")
          .select("id, status, created_at")
          .eq("host_id", hostData.id),
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

      setListings((listingsRes.data as ListingItem[]) || []);
      setBookings((bookingsRes.data as BookingItem[]) || []);
      setInquiries((inquiriesRes.data as InquiryItem[]) || []);

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

  // Submit host verification action
  async function handleSubmitVerification() {
    if (!host) return;
    setSubmittingVerification(true);
    const { error } = await supabase
      .from("hosts")
      .update({ verification_status: "under_review" })
      .eq("id", host.id);
    setSubmittingVerification(false);

    if (error) {
      alert("Failed to submit verification: " + error.message);
    } else {
      setHost((prev) => (prev ? { ...prev, verification_status: "under_review" } : null));
    }
  }

  // Listing completeness helper
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
      tips.push(`Upload ${4 - l.photos.length} more photos`);
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

  if (!host) {
    return (
      <div className="overflow-hidden rounded-3xl border border-stone-200 bg-white p-8 text-center sm:p-12 shadow-sm">
        <Building2 className="size-12 text-stone-300 mx-auto mb-3" />
        <h2 className="font-brand text-2xl font-bold text-[#181113]">Host account required</h2>
        <p className="mt-1 text-sm text-stone-500">Please sign in as a host to view your checklist.</p>
        <Link
          href={ROUTES.hostLogin}
          className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#800020] px-6 py-2.5 text-xs font-bold text-white"
        >
          Host Sign In
        </Link>
      </div>
    );
  }

  const pendingBookings = bookings.filter((b) => b.status === "requested" || b.status === "paid_pending_host");
  const inquiriesCount = inquiries.length;
  const activeListingsCount = listings.filter((l) => l.is_active || l.listing_status === "active").length;

  // Completed items count calculation (out of 4 core items)
  let completedCount = 0;
  if (host.is_verified) completedCount++;
  if (listings.length > 0) completedCount++;
  if (pendingBookings.length === 0 && inquiriesCount >= 0) completedCount++;
  if (Boolean(activeTier)) completedCount++;

  return (
    <div className="space-y-6 sm:space-y-8 max-w-5xl mx-auto">
      {/* ========================================================================= */}
      {/* 1. Header Toolbar with Back Button                                        */}
      {/* ========================================================================= */}
      <div className="flex flex-col gap-3 border-b border-stone-200/80 pb-5">
        <Link
          href={ROUTES.dashboard}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-stone-500 hover:text-[#800020] transition w-fit"
        >
          <ArrowLeft className="size-3.5" />
          <span>Back to Host Overview</span>
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="font-brand text-2xl sm:text-3xl font-black text-[#181113] tracking-tight">
                Host Checklist &amp; Next Steps
              </h1>
              {host.is_verified ? (
                <VerifiedBadge text="Verified Host" size="sm" />
              ) : (
                <PendingVerificationBadge />
              )}
            </div>
            <p className="text-xs sm:text-sm text-stone-500 mt-1 max-w-2xl leading-relaxed">
              Actionable recommendations to maximize your bookings, trust badge, search visibility, and guest conversions on Beddn.
            </p>
          </div>

          {/* Quick Progress Indicator */}
          <div className="flex items-center gap-3 rounded-2xl border border-stone-200 bg-white px-4 py-2.5 shadow-2xs self-start sm:self-auto shrink-0">
            <div className="text-right">
              <p className="text-[11px] font-semibold text-stone-500">Checklist Progress</p>
              <p className="text-sm font-black text-[#800020]">{completedCount} of 4 complete</p>
            </div>
            <div className="relative size-9">
              <svg className="size-full -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-stone-100"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-[#800020] transition-all duration-500"
                  strokeDasharray={`${(completedCount / 4) * 100}, 100`}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-stone-700">
                {Math.round((completedCount / 4) * 100)}%
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. Core Checklist Milestones (The 3 Actionable Cards)                      */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: Host Trust & Verification */}
        <div className={`flex flex-col justify-between rounded-3xl border p-5 sm:p-6 transition shadow-xs ${
          host.is_verified
            ? "border-emerald-200/80 bg-gradient-to-b from-emerald-50/30 to-white"
            : "border-stone-200/90 bg-white"
        }`}>
          <div>
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-stone-500">
                <ShieldCheck className={`size-4 ${host.is_verified ? "text-emerald-600" : "text-[#800020]"}`} />
                <span>Trust &amp; Verification</span>
              </div>
              {host.is_verified ? (
                <span className="rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2.5 py-0.5">
                  Complete
                </span>
              ) : (
                <span className="rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold px-2.5 py-0.5">
                  Action Required
                </span>
              )}
            </div>

            <h3 className="font-brand text-base font-bold text-stone-900">
              {host.is_verified
                ? "Your Host Account is Verified"
                : host.verification_status === "under_review"
                ? "Verification Under Review"
                : "Submit Host Verification"}
            </h3>

            <p className="text-xs text-stone-600 mt-1.5 leading-relaxed">
              {host.is_verified
                ? "Your listings proudly feature the Beddn Verified Trust Badge, boosting guest confidence and booking conversions."
                : host.verification_status === "under_review"
                ? "Our review team is actively inspecting your submission. You will receive an email confirmation upon approval."
                : "Verified hosts receive up to 3x more guest inquiries. Submit your national ID or business license to activate your badge."}
            </p>
          </div>

          <div className="mt-5 pt-4 border-t border-stone-100">
            {!host.is_verified && host.verification_status !== "under_review" ? (
              <Button
                size="sm"
                onClick={handleSubmitVerification}
                disabled={submittingVerification}
                className="w-full rounded-full bg-[#800020] text-xs font-bold text-white hover:bg-[#68001a] shadow-xs"
              >
                {submittingVerification ? "Submitting..." : "Submit for Verification"}
              </Button>
            ) : host.is_verified ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700">
                  <CheckCircle2 className="size-4 text-emerald-600" />
                  <span>Verified Badge Active</span>
                </div>
                <VerifiedBadge text="Badge Live" size="xs" />
              </div>
            ) : (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs font-bold text-amber-700">
                  <span className="flex items-center gap-1">
                    <Clock className="size-3.5 text-amber-600" />
                    Review in Progress
                  </span>
                  <span className="text-[11px] text-stone-400 font-normal">Pending approval</span>
                </div>
                <p className="text-[11px] text-stone-500 leading-tight">
                  Verification taking longer than usual? Contact admin directly:
                </p>
                <div className="flex items-center gap-2 pt-0.5">
                  <a
                    href="https://wa.me/254727993661?text=Hi%20Beddn%20Admin,%20my%20host%20verification%20is%20pending.%20Please%20help%20verify%20my%20account."
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full bg-[#25D366] hover:bg-[#128C7E] text-white px-3 py-2 text-xs font-bold shadow-2xs transition"
                  >
                    <WhatsAppIcon className="size-3.5" />
                    <span>WhatsApp Admin</span>
                  </a>
                  <a
                    href="tel:+254727993661"
                    className="inline-flex items-center justify-center gap-1 rounded-full border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 px-3 py-2 text-xs font-bold shadow-2xs transition"
                    title="Call Admin Directly"
                  >
                    <Phone className="size-3 text-[#800020]" />
                    <span>Call</span>
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Card 2: Pending Guest Leads & Inquiries */}
        <div className={`flex flex-col justify-between rounded-3xl border p-5 sm:p-6 transition shadow-xs ${
          pendingBookings.length > 0
            ? "border-amber-300 bg-gradient-to-b from-amber-50/40 to-white"
            : "border-stone-200/90 bg-white"
        }`}>
          <div>
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-stone-500">
                <Clock className="size-4 text-amber-600" />
                <span>Guest Leads &amp; Bookings</span>
              </div>
              {pendingBookings.length > 0 ? (
                <span className="rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold px-2.5 py-0.5">
                  {pendingBookings.length} Pending
                </span>
              ) : (
                <span className="rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2.5 py-0.5">
                  Up to Date
                </span>
              )}
            </div>

            <h3 className="font-brand text-base font-bold text-stone-900">
              {pendingBookings.length > 0
                ? `${pendingBookings.length} Booking Request${pendingBookings.length > 1 ? "s" : ""} Awaiting Confirmation`
                : inquiriesCount > 0
                ? `${inquiriesCount} Inquiries Received`
                : "All Inquiries Up to Date"}
            </h3>

            <p className="text-xs text-stone-600 mt-1.5 leading-relaxed">
              {pendingBookings.length > 0
                ? "Guests are waiting for your check-in confirmation. Confirming promptly locks the dates on your calendar and guarantees payout."
                : inquiriesCount > 0
                ? "Follow up with potential guests on WhatsApp to answer questions and finalize check-in times."
                : "You're all caught up! New guest inquiries will notify you via in-app alert, SMS, and email."}
            </p>
          </div>

          <div className="mt-5 pt-4 border-t border-stone-100 space-y-2">
            <Link
              href={pendingBookings.length > 0 ? ROUTES.dashboardBookings : ROUTES.dashboardInquiries}
              className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-full border border-stone-300 bg-white text-xs font-bold text-stone-800 hover:border-[#800020] hover:text-[#800020] transition shadow-2xs"
            >
              <span>{pendingBookings.length > 0 ? "Review Booking Requests" : "Open Inquiries"}</span>
              <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </div>

        {/* Card 3: Marketplace Promotion (Beddn Pro) */}
        <div className={`flex flex-col justify-between rounded-3xl border p-5 sm:p-6 transition shadow-xs ${
          activeTier
            ? "border-amber-300 bg-gradient-to-b from-amber-50/30 to-white"
            : "border-[#f9c8d4] bg-gradient-to-b from-[#fdf2f4]/60 to-white"
        }`}>
          <div>
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#a3193d]">
                <Crown className="size-4 text-amber-500" />
                <span>Marketplace Promotion</span>
              </div>
              {activeTier ? (
                <span className="rounded-full bg-amber-100 text-amber-900 text-[10px] font-bold px-2.5 py-0.5">
                  Pro Active
                </span>
              ) : (
                <span className="rounded-full bg-[#fdf2f4] text-[#800020] text-[10px] font-bold px-2.5 py-0.5 border border-[#f9c8d4]">
                  Boost Available
                </span>
              )}
            </div>

            <h3 className="font-brand text-base font-bold text-[#181113]">
              {activeTier ? `${activeTier} Tier is Active` : "Upgrade to Beddn Pro"}
            </h3>

            <p className="text-xs text-stone-600 mt-1.5 leading-relaxed">
              {activeTier
                ? `Your listings enjoy priority ranking and verified Pro badges across search results (Expires ${tierExpiry || "soon"}).`
                : "Boost your listings to the top of city searches and homepage carousels for higher guest discovery and maximum bookings."}
            </p>
          </div>

          <div className="mt-5 pt-4 border-t border-[#f9c8d4]/60">
            <Link
              href={ROUTES.dashboardPro}
              className="flex h-9 w-full items-center justify-center gap-1.5 rounded-full bg-[#800020] text-xs font-bold text-white hover:bg-[#68001a] shadow-xs transition"
            >
              <Sparkles className="size-3.5" />
              <span>{activeTier ? "Manage Pro Membership" : "Upgrade to Beddn Pro"}</span>
            </Link>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. Property Quality & Completeness Breakdown                              */}
      {/* ========================================================================= */}
      <div className="rounded-3xl border border-stone-200/90 bg-white p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-stone-100 pb-4">
          <div>
            <h3 className="font-brand text-lg sm:text-xl font-bold text-[#181113]">
              Property Completeness &amp; Quality Tips
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              High-scoring listings convert up to 4x more visitors into inquiries and confirmed bookings.
            </p>
          </div>

          <Link
            href={ROUTES.newListing}
            className="inline-flex items-center gap-1.5 rounded-full bg-[#800020] px-4 py-2 text-xs font-bold text-white hover:bg-[#68001a] transition self-start sm:self-auto shadow-2xs"
          >
            <span>+ Add New Listing</span>
          </Link>
        </div>

        {listings.length === 0 ? (
          <div className="py-10 text-center">
            <Building2 className="size-12 text-stone-300 mx-auto mb-3" />
            <p className="text-sm font-bold text-stone-700">No properties added yet</p>
            <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
              Create your first listing to unlock visibility, guest traffic, and direct WhatsApp inquiries.
            </p>
            <Link
              href={ROUTES.newListing}
              className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-[#800020] px-5 py-2 text-xs font-bold text-white"
            >
              List your space now
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-stone-100">
            {listings.map((l) => {
              const { score, tips } = computeCompleteness(l);
              return (
                <div key={l.id} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  {/* Property Info */}
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
                      <p className="truncate text-sm font-bold text-stone-900 leading-tight">
                        {l.title || l.name || "Untitled space"}
                      </p>
                      <p className="truncate text-xs text-stone-500 mt-0.5">
                        {l.city || "East Africa"} · {l.price_per_night ? `KES ${l.price_per_night}/night` : l.hourly_rate ? `KES ${l.hourly_rate}/hr` : "No price set"}
                      </p>
                      <span className={`inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        l.is_active ? "bg-emerald-50 text-emerald-700" : "bg-stone-100 text-stone-600"
                      }`}>
                        {l.is_active ? "Active" : "Inactive / Draft"}
                      </span>
                    </div>
                  </div>

                  {/* Completeness Bar */}
                  <div className="md:w-1/3">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-semibold text-stone-600">Completeness</span>
                      <strong className={`font-bold ${score >= 80 ? "text-emerald-700" : "text-[#800020]"}`}>
                        {score}%
                      </strong>
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
                      <p className="text-[11px] text-amber-700 mt-1.5 flex items-center gap-1">
                        <AlertCircle className="size-3 shrink-0" />
                        <span className="truncate">{tips[0]}</span>
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 justify-end">
                    <Link
                      href={ROUTES.dashboardListings}
                      className="inline-flex h-8 items-center justify-center rounded-full border border-stone-200 px-4 text-xs font-semibold text-stone-700 hover:border-[#800020] hover:text-[#800020] transition shadow-2xs"
                    >
                      Edit Listing
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 4. Direct Host Concierge Support Card                                     */}
      {/* ========================================================================= */}
      <div className="rounded-3xl border border-[#f9c8d4]/80 bg-gradient-to-br from-[#fdf2f4]/60 via-white to-stone-50 p-6 sm:p-7 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h4 className="font-brand text-base sm:text-lg font-bold text-[#181113]">
              Need assistance with your listings or payouts?
            </h4>
            <p className="text-xs sm:text-sm text-stone-600 mt-1 max-w-xl leading-relaxed">
              Our East Africa host onboarding team is available daily on WhatsApp and phone to help optimize your profile, verify IDs, or import your Airbnb listings.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <a
              href="https://wa.me/254727993661?text=Hi%20Beddn%20Team,%20I'm%20a%20host%20and%20need%20help%20with%20my%20account."
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full bg-[#25D366] hover:bg-[#128C7E] text-white px-4 py-2 text-xs font-bold shadow-xs transition"
            >
              <WhatsAppIcon className="size-3.5" />
              <span>WhatsApp Support</span>
            </a>
            <a
              href="tel:+254727993661"
              className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-white hover:bg-stone-50 text-stone-800 px-4 py-2 text-xs font-bold shadow-2xs transition"
            >
              <Phone className="size-3.5 text-[#800020]" />
              <span>Call +254 727 993 661</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
