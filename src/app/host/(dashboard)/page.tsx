"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/icon";
import { DashboardOverviewSkeleton } from "@/components/dashboard-skeletons";
import { ROUTES } from "@/lib/routes";

type Stat = {
  label: string;
  value: string | number;
  icon: string;
  href: string;
  tone?: "brand" | "warning" | "muted";
};

type HostStatus = {
  id: string;
  name?: string | null;
  is_verified: boolean;
  verification_status: string;
} | null;

type Announcement = {
  id: string;
  title: string;
  message: string;
  priority: "normal" | "important" | "urgent";
  is_mandatory: boolean;
  expires_at: string | null;
  created_at: string;
};

const QUICK_ACTIONS = [
  { label: "Create listing", description: "Add a new place or experience", href: ROUTES.newListing, icon: "line-md:plus" },
  { label: "Inquiries", description: "See and reply to leads", href: ROUTES.dashboardInquiries, icon: "line-md:bell" },
  { label: "Calendar", description: "Block dates and see demand", href: ROUTES.dashboardCalendar, icon: "line-md:calendar" },
  { label: "Feedback", description: "See what guests said", href: ROUTES.dashboardFeedback, icon: "line-md:star" },
];

function StatCard({ label, value, icon, href, tone }: Stat) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border bg-white p-4 transition-shadow hover:shadow-md sm:p-5"
    >
      <div className="flex items-start justify-between">
        <span
          className={`flex size-10 items-center justify-center rounded-xl ${
            tone === "brand"
              ? "bg-[#f8eef2] text-crimson"
              : tone === "warning"
              ? "bg-amber-50 text-amber-700"
              : "bg-[#f5f1f2] text-[#6f6568]"
          }`}
        >
          <Icon icon={icon} className="h-5 w-5" />
        </span>
        <Icon icon="line-md:chevron-right" className="h-4 w-4 text-[#d8c8cd] transition-colors group-hover:text-crimson" />
      </div>
      <p className="mt-4 text-2xl font-bold text-[#2b000a]">{value}</p>
      <p className="mt-0.5 text-sm text-muted-foreground">{label}</p>
    </Link>
  );
}

export default function DashboardPage() {
  const supabase = useMemo(() => createClient(), []);
  const [isAdmin, setIsAdmin] = useState(false);
  const [host, setHost] = useState<HostStatus>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [submittingVerification, setSubmittingVerification] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [stats, setStats] = useState<Stat[]>([]);
  const [pendingNew, setPendingNew] = useState(0);
  const [loading, setLoading] = useState(true);

  async function handleDismissAnnouncement(annId: string) {
    if (!host) return;
    setAnnouncements((prev) => prev.filter((a) => a.id !== annId));
    await supabase.from("host_announcement_dismissals").insert({
      announcement_id: annId,
      host_id: host.id,
    });
  }

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
      setHost((prev) => prev ? { ...prev, verification_status: "under_review" } : null);
    }
  }

  useEffect(() => {
    async function load() {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        setLoading(false);
        return;
      }
      setUserEmail(user.user.email ?? "");

      const { data: profile } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", user.user.id)
        .single();

      const admin = profile?.is_admin ?? false;
      setIsAdmin(admin);

      if (admin) {
        const [
          pendingHosts,
          pendingListings,
          paidBookings,
          disputes,
          withdrawals,
          feedback,
          demand,
          payments,
        ] = await Promise.all([
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
          supabase
            .from("payments")
            .select("id", { count: "exact", head: true })
            .eq("status", "initialized"),
        ]);

        setStats([
          { label: "Host badges pending", value: pendingHosts.count ?? 0, icon: "line-md:account", href: ROUTES.adminHosts, tone: "warning" },
          { label: "Listing badges pending", value: pendingListings.count ?? 0, icon: "line-md:home", href: ROUTES.adminListings, tone: "warning" },
          { label: "Active paid bookings", value: paidBookings.count ?? 0, icon: "line-md:calendar", href: ROUTES.adminBookings, tone: "brand" },
          { label: "Disputes / rejected", value: disputes.count ?? 0, icon: "line-md:bell", href: ROUTES.adminDisputes, tone: "warning" },
          { label: "Withdrawal requests", value: withdrawals.count ?? 0, icon: "line-md:briefcase", href: ROUTES.adminWithdrawals, tone: "brand" },
          { label: "Feedback items", value: feedback.count ?? 0, icon: "line-md:star", href: ROUTES.adminFeedback },
          { label: "Demand searches", value: demand.count ?? 0, icon: "line-md:search", href: ROUTES.adminDemand },
          { label: "Open payments", value: payments.count ?? 0, icon: "line-md:check-all", href: ROUTES.adminPayments },
        ]);
        setLoading(false);
        return;
      }

      const { data: hostData } = await supabase
        .from("hosts")
        .select("id, name, is_verified, verification_status")
        .eq("user_id", user.user.id)
        .maybeSingle();

      setHost((hostData as HostStatus) ?? null);
      if (!hostData) {
        setStats([]);
        setLoading(false);
        return;
      }

      // Fetch active announcements and dismissals for this host
      const [announcementsRes, dismissalsRes] = await Promise.all([
        supabase
          .from("host_announcements")
          .select("*")
          .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`),
        supabase
          .from("host_announcement_dismissals")
          .select("announcement_id")
          .eq("host_id", hostData.id),
      ]);

      const dismissedIds = new Set((dismissalsRes.data ?? []).map((d: any) => d.announcement_id));
      const visible = (announcementsRes.data ?? []).filter(
        (a: any) => !dismissedIds.has(a.id)
      );
      setAnnouncements(visible);

      const { data: listingRows } = await supabase
        .from("listings")
        .select("id, is_active, listing_status")
        .eq("host_id", hostData.id);
      const listingIds = (listingRows ?? []).map((listing: { id: string }) => listing.id);
      const activeListings = (listingRows ?? []).filter(
        (listing: { is_active?: boolean; listing_status?: string | null }) =>
          listing.is_active || listing.listing_status === "active"
      ).length;

      // Demand proof: views, availability checks, inquiries, WhatsApp clicks.
      const [totalInquiries, newInquiries, eventRowsRes] = await Promise.all([
        supabase.from("inquiries").select("id", { count: "exact", head: true }).eq("host_id", hostData.id),
        supabase
          .from("inquiries")
          .select("id", { count: "exact", head: true })
          .eq("host_id", hostData.id)
          .eq("status", "NEW"),
        listingIds.length
          ? supabase.from("listing_events").select("event_type").in("listing_id", listingIds).limit(5000)
          : Promise.resolve({ data: [] as { event_type: string }[] }),
      ]);

      const events = (eventRowsRes.data ?? []) as { event_type: string }[];
      const countEvent = (type: string) => events.filter((e) => e.event_type === type).length;

      setPendingNew(newInquiries.count ?? 0);
      setStats([
        { label: "Listing views", value: countEvent("LISTING_VIEW"), icon: "line-md:home", href: ROUTES.dashboardListings },
        { label: "Availability checks", value: countEvent("AVAILABILITY_CHECKED"), icon: "line-md:calendar", href: ROUTES.dashboardCalendar },
        { label: "Inquiries", value: totalInquiries.count ?? 0, icon: "line-md:bell", href: ROUTES.dashboardInquiries, tone: "brand" },
        { label: "New inquiries", value: newInquiries.count ?? 0, icon: "line-md:bell", href: ROUTES.dashboardInquiries, tone: "warning" },
        { label: "WhatsApp clicks", value: countEvent("WHATSAPP_CLICK"), icon: "line-md:account", href: ROUTES.dashboardInquiries },
        { label: "Active listings", value: activeListings, icon: "line-md:check-all", href: ROUTES.dashboardListings, tone: "brand" },
      ]);
      setLoading(false);
    }
    load();
  }, [supabase]);

  const badge = isAdmin
    ? "Admin workspace"
    : host?.is_verified
    ? "Verified host"
    : host
    ? "Verification badge pending"
    : "Guest account";

  const greetingName = host?.name?.split(" ")[0] || userEmail.split("@")[0] || "there";

  if (loading) {
    return <DashboardOverviewSkeleton />;
  }

  // No host profile yet — invite them to create one.
  if (!isAdmin && !host) {
    return (
      <div className="overflow-hidden rounded-3xl border bg-white">
        <div className="grid items-center gap-6 p-6 sm:grid-cols-[1fr_auto] sm:p-10">
          <div>
            <Badge className="mb-4 rounded-full bg-[#fbf7f8] text-[#800020] hover:bg-[#fbf7f8]">
              {badge}
            </Badge>
            <h1 className="font-brand text-3xl text-[#2b000a] sm:text-4xl">Become a Beddn host</h1>
            <p className="mt-3 max-w-md text-sm text-muted-foreground">
              This account{userEmail ? ` (${userEmail})` : ""} isn&apos;t linked to a host profile yet.
              Create one and list hourly stays, overnight stays, or experiences in minutes.
            </p>
            <Link
              href={ROUTES.newListing}
              className="mt-6 inline-flex h-11 items-center gap-2 rounded-full bg-[#800020] px-6 text-sm font-bold text-white hover:bg-[#6b1029]"
            >
              Create host profile <Icon icon="line-md:chevron-right" className="h-4 w-4" />
            </Link>
          </div>
          <Image
            src="https://res.cloudinary.com/dzjhuss7i/image/upload/v1781029370/empty-host-needed_vum5fe.png"
            alt=""
            width={220}
            height={180}
            className="mx-auto h-auto w-[180px] sm:w-[220px]"
            aria-hidden
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Badge className="mb-2 rounded-full bg-[#fbf7f8] text-[#800020] hover:bg-[#fbf7f8]">
            {badge}
          </Badge>
          <h1 className="font-brand text-3xl text-[#2b000a] sm:text-4xl">
            {isAdmin ? "Admin overview" : `Welcome back, ${greetingName}`}
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {isAdmin
              ? "Monitor verification badges, payments, disputes, withdrawals, feedback, and demand."
              : "Here’s how your hosting is going."}
          </p>
        </div>
      </div>

      {/* Needs attention */}
      {!isAdmin && pendingNew > 0 && (
        <Link
          href={ROUTES.dashboardInquiries}
          className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3.5 transition-colors hover:bg-amber-100/60"
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
            <Icon icon="line-md:bell" className="h-4 w-4" />
          </span>
          <p className="text-sm font-semibold text-amber-900">
            {pendingNew} new inquiry{pendingNew === 1 ? "" : "s"} waiting for your response
          </p>
          <Icon icon="line-md:chevron-right" className="ml-auto h-4 w-4 shrink-0 text-amber-700" />
        </Link>
      )}

      {/* Announcements */}
      {!isAdmin && announcements.length > 0 && (
        <div className="space-y-3">
          {announcements.map((ann) => {
            const isUrgent = ann.priority === "urgent";
            const isImportant = ann.priority === "important";
            return (
              <div
                key={ann.id}
                className={`flex gap-3 rounded-2xl border px-4 py-3.5 shadow-sm ${
                  isUrgent
                    ? "bg-red-50 border-red-200 text-red-900"
                    : isImportant
                    ? "bg-amber-50 border-amber-200 text-amber-900"
                    : "bg-blue-50 border-blue-200 text-blue-900"
                }`}
              >
                <span
                  className={`flex size-9 shrink-0 items-center justify-center rounded-full ${
                    isUrgent
                      ? "bg-red-100 text-red-700"
                      : isImportant
                      ? "bg-amber-100 text-amber-700"
                      : "bg-blue-100 text-blue-700"
                  }`}
                >
                  <Icon icon="line-md:bell" className="h-4 w-4" />
                </span>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-sm leading-snug">{ann.title}</p>
                    {ann.is_mandatory && (
                      <Badge className="bg-red-200 text-red-900 border-none text-[10px] uppercase font-extrabold px-1.5 py-0.5">
                        Mandatory
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-black/75 whitespace-pre-wrap">{ann.message}</p>
                </div>
                {!ann.is_mandatory && (
                  <button
                    onClick={() => handleDismissAnnouncement(ann.id)}
                    className="ml-auto flex size-6 shrink-0 items-center justify-center rounded-full text-black/40 hover:bg-black/5 hover:text-black/75 transition-colors"
                  >
                    <Icon icon="line-md:close" className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Verification alerts */}
      {!isAdmin && host && (
        <>
          {(host.verification_status === "not_started" || !host.verification_status) && (
            <div className="flex flex-col gap-4 rounded-2xl border border-amber-200 bg-amber-50/50 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <Image
                  src="https://res.cloudinary.com/dzjhuss7i/image/upload/v1781029380/spot-verified_anp2nf.png"
                  alt=""
                  width={44}
                  height={40}
                  className="h-auto w-[40px] shrink-0 grayscale opacity-80"
                  aria-hidden
                />
                <div>
                  <h3 className="font-bold text-[#2b000a] text-sm">Action Required: Complete verification</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                    Submit your profile details for verification to receive your Verified Host badge.
                    For help, contact admins: Tanzania +255748962145 or +255743607369;
                    Kenya +254727993661.
                  </p>
                </div>
              </div>
              <Button
                onClick={handleSubmitVerification}
                disabled={submittingVerification}
                className="h-9 shrink-0 rounded-full bg-[#800020] text-white font-bold hover:bg-[#6b1029] text-xs px-4"
              >
                {submittingVerification ? "Submitting..." : "Submit for Verification"}
              </Button>
            </div>
          )}

          {host.verification_status === "under_review" && (
            <div className="flex items-center gap-3 rounded-2xl border border-[#f1e6ea] bg-[#fbf7f8] p-4">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white text-crimson">
                <Icon icon="line-md:loading-twotone-loop" className="h-4 w-4 animate-spin" />
              </span>
              <div>
                <p className="font-bold text-[#2b000a] text-sm">Verification is in progress</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  If you feel stuck, contact the Beddn verification team on WhatsApp:
                  Tanzania +255748962145 or +255743607369; Kenya +254727993661.
                  Once approved, your Verified Host badge will be assigned automatically.
                </p>
              </div>
            </div>
          )}

          {(host.verification_status === "verified" || host.is_verified) && (
            <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                <Icon icon="line-md:check-all" className="h-4 w-4" />
              </span>
              <div>
                <p className="font-bold text-emerald-950 text-sm">Verification approved</p>
                <p className="text-xs text-emerald-800 mt-0.5">
                  Your profile is verified. The Verified Host badge is now active on your profile and listings.
                </p>
              </div>
            </div>
          )}
        </>
      )}

      {/* Demand intro + quick actions (hosts only) */}
      {!isAdmin && host && (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <div className="flex flex-col justify-between rounded-3xl border bg-white p-6 shadow-sm">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-cranberry">
                Beddn demand
              </p>
              <p className="mt-2 font-brand text-2xl leading-snug text-[#2b000a]">
                Organized leads, not random WhatsApp messages.
              </p>
              <p className="mt-3 text-sm text-muted-foreground">
                Beddn tracks views, availability checks, inquiries, and WhatsApp clicks. Guests
                can continue directly to your WhatsApp after an inquiry, and payments are agreed
                outside Beddn for now.
              </p>
            </div>
            <Link
              href={ROUTES.dashboardInquiries}
              className="mt-6 inline-flex h-10 w-fit items-center gap-2 rounded-full bg-[#800020] px-5 text-sm font-bold text-white transition-colors hover:bg-[#6b1029]"
            >
              <Icon icon="line-md:bell" className="h-4 w-4" /> View inquiries
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {QUICK_ACTIONS.map(({ label, description, href, icon }) => (
              <Link
                key={label}
                href={href}
                className="group flex flex-col justify-between rounded-2xl border bg-white p-4 transition-shadow hover:shadow-md"
              >
                <span className="flex size-9 items-center justify-center rounded-xl bg-[#fbf7f8] text-[#800020]">
                  <Icon icon={icon} className="h-4 w-4" />
                </span>
                <div className="mt-3">
                  <p className="text-sm font-bold text-[#2b000a]">{label}</p>
                  <p className="mt-0.5 hidden text-xs text-muted-foreground sm:block">{description}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Stats */}
      <div>
        <p className="mb-3 text-sm font-bold uppercase tracking-wide text-[#a08b92]">
          {isAdmin ? "Platform activity" : "Your activity"}
        </p>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {stats.map((stat) => (
            <StatCard key={stat.label} {...stat} />
          ))}
        </div>
      </div>
    </div>
  );
}
