"use client";

import Link from "next/link";
import { Megaphone } from "lucide-react";
import { ROUTES } from "@/lib/routes";
import { DashboardShell, type NavSection } from "@/components/dashboard/dashboard-shell";

const ADMIN_SECTIONS: NavSection[] = [
  {
    title: "Marketplace",
    items: [
      { href: ROUTES.adminHome, label: "Overview", icon: "solar:widget-2-bold-duotone" },
      { href: ROUTES.adminListings, label: "Listings", icon: "solar:buildings-3-bold-duotone" },
      { href: ROUTES.adminHosts, label: "Hosts", icon: "solar:user-bold-duotone" },
      { href: ROUTES.adminUsers, label: "Guests & Users", icon: "solar:users-group-two-rounded-bold-duotone" },
      { href: ROUTES.adminBookings, label: "Bookings", icon: "solar:calendar-date-bold-duotone" },
      { href: ROUTES.adminInquiries, label: "Inquiries", icon: "solar:chat-round-dots-bold-duotone" },
      { href: ROUTES.adminDemand, label: "Demand & Supply Gaps", icon: "solar:chart-square-bold-duotone" },
    ],
  },
  {
    title: "Growth & Monetisation",
    items: [
      { href: ROUTES.adminFeatured, label: "Pro & Featured Tiers", icon: "solar:crown-star-bold-duotone" },
      { href: ROUTES.adminAnalytics, label: "Marketplace Analytics", icon: "solar:chart-2-bold-duotone" },
      { href: ROUTES.adminAnnouncements, label: "Host Announcements", icon: "solar:megaphone-bold-duotone" },
    ],
  },
  {
    title: "Trust & Moderation",
    items: [
      { href: ROUTES.adminDisputes, label: "Reports & Moderation", icon: "solar:shield-warning-bold-duotone" },
      { href: ROUTES.adminFeedback, label: "Feedback", icon: "solar:star-bold-duotone" },
      { href: ROUTES.adminFeatureRequests, label: "Feature Requests", icon: "solar:lightbulb-bolt-bold-duotone" },
      { href: ROUTES.adminCurrency, label: "Currency Rates", icon: "solar:dollar-minimalistic-bold-duotone" },
      { href: ROUTES.adminNotifications, label: "Notification Logs", icon: "solar:bell-bold-duotone" },
    ],
  },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const actionButton = (
    <Link
      href={ROUTES.adminAnnouncements}
      className="flex w-full items-center justify-center gap-2 rounded-full bg-[#800020] px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-[#68001a] active:scale-95 transition"
    >
      <Megaphone className="size-4" />
      <span>New Announcement</span>
    </Link>
  );

  return (
    <DashboardShell
      role="admin"
      userEmail="admin@beddn.com"
      userName="Admin Console"
      isAdmin={true}
      isHost={true}
      sections={ADMIN_SECTIONS}
      actionButton={actionButton}
    >
      {children}
    </DashboardShell>
  );
}
