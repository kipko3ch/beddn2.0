"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { ROUTES } from "@/lib/routes";
import { DashboardShell, type NavSection } from "@/components/dashboard/dashboard-shell";

const HOST_SECTIONS: NavSection[] = [
  {
    title: "Hosting",
    items: [
      { href: ROUTES.dashboard, label: "Overview", icon: "solar:home-2-bold-duotone" },
      { href: ROUTES.dashboardListings, label: "My Listings", icon: "solar:buildings-3-bold-duotone" },
      { href: ROUTES.dashboardBookings, label: "Bookings", icon: "solar:calendar-date-bold-duotone" },
      { href: ROUTES.dashboardInquiries, label: "Inquiries", icon: "solar:chat-round-dots-bold-duotone" },
      { href: ROUTES.dashboardCalendar, label: "Calendar", icon: "solar:calendar-minimalistic-bold-duotone" },
    ],
  },
  {
    title: "Performance & Growth",
    items: [
      { href: `${ROUTES.dashboard}#analytics`, label: "Analytics — Beta", icon: "solar:chart-2-bold-duotone" },
      { href: ROUTES.dashboardDemand, label: "Marketplace Demand", icon: "solar:magnifer-bold-duotone" },
      { href: ROUTES.dashboardFeedback, label: "Guest Feedback", icon: "solar:star-bold-duotone" },
      { href: ROUTES.dashboardFeatures, label: "Suggest Feature", icon: "solar:lightbulb-bolt-bold-duotone" },
    ],
  },
  {
    title: "Account & Updates",
    items: [
      { href: ROUTES.dashboardNotifications, label: "Notifications", icon: "solar:bell-bold-duotone" },
      { href: ROUTES.dashboardPro, label: "Host Membership", icon: "solar:crown-star-bold-duotone" },
      { href: ROUTES.dashboardProfile, label: "Profile & Settings", icon: "solar:user-circle-bold-duotone" },
    ],
  },
];

export function HostShell({
  email,
  userName,
  avatarUrl,
  hostId,
  isAdmin = false,
  isHost = true,
  activeTier,
  activeTierExpires,
  children,
}: {
  email: string;
  userName?: string | null;
  avatarUrl?: string | null;
  hostId?: string;
  isAdmin: boolean;
  isHost: boolean;
  activeTier?: string | null;
  activeTierExpires?: string | null;
  children: React.ReactNode;
}) {
  const actionButton = (
    <Link
      href={ROUTES.newListing}
      className="flex w-full items-center justify-center gap-2 rounded-full bg-[#800020] px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-[#68001a] active:scale-95 transition"
    >
      <Plus className="size-4" />
      <span>New Listing</span>
    </Link>
  );

  return (
    <DashboardShell
      role="host"
      userEmail={email}
      userName={userName}
      avatarUrl={avatarUrl}
      hostId={hostId}
      isAdmin={isAdmin}
      isHost={isHost}
      sections={HOST_SECTIONS}
      actionButton={actionButton}
      activeTier={activeTier}
      activeTierExpires={activeTierExpires}
    >
      {children}
    </DashboardShell>
  );
}
