"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { format } from "date-fns";
import {
  Menu,
  ShieldCheck,
  Crown,
  Sparkles,
  ArrowRight,
  LogOut,
  Repeat,
  Compass,
  LayoutDashboard,
  CheckCircle2,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
} from "lucide-react";
import { MeshGradient } from "@/components/ui/mesh-gradient";
import { createClient } from "@/lib/supabase/client";
import { ROUTES } from "@/lib/routes";
import { Icon } from "@/components/icon";
import { RoleSwitchTransition } from "@/components/role-switch-transition";
import { NotificationPopover } from "@/components/dashboard/notification-popover";
import { ProUpgradeModal } from "@/components/dashboard/pro-upgrade-modal";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export interface NavItem {
  href: string;
  label: string;
  icon: string;
  badge?: string | number;
}

export interface NavSection {
  title?: string;
  items: NavItem[];
}

export interface DashboardShellProps {
  role: "host" | "admin";
  userEmail: string;
  userName?: string | null;
  avatarUrl?: string | null;
  hostId?: string;
  isAdmin?: boolean;
  isHost?: boolean;
  sections: NavSection[];
  actionButton?: ReactNode;
  activeTier?: string | null;
  activeTierExpires?: string | null;
  children: ReactNode;
}

export function DashboardShell({
  role,
  userEmail,
  userName,
  avatarUrl,
  hostId,
  isAdmin = false,
  isHost = false,
  sections,
  actionButton,
  activeTier,
  activeTierExpires,
  children,
}: DashboardShellProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [switching, setSwitching] = useState<{ to: string; mode: "host" | "traveler" } | null>(null);
  const [resolvedAvatar, setResolvedAvatar] = useState<string | null>(avatarUrl || null);
  const supabase = createClient();

  // Load collapsed preference from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("beddn_sidebar_collapsed");
      if (saved === "true") {
        setIsCollapsed(true);
      }
    } catch {
      // ignore
    }
  }, []);

  const toggleSidebar = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("beddn_sidebar_collapsed", String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  // Close mobile drawer on route changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Resolve avatar if not passed via SSR props
  useEffect(() => {
    if (avatarUrl) {
      setResolvedAvatar(avatarUrl);
      return;
    }
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        const meta =
          (user.user_metadata?.avatar_url as string | undefined) ||
          (user.user_metadata?.picture as string | undefined) ||
          null;
        if (meta) setResolvedAvatar(meta);
      }
    });
  }, [avatarUrl, supabase]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    window.location.href = ROUTES.home;
  }

  // Greeting based on current hour
  const currentHour = new Date().getHours();
  const greeting = currentHour < 12 ? "Good Morning" : currentHour < 17 ? "Good Afternoon" : "Good Evening";
  const displayName = userName || userEmail.split("@")[0] || (role === "admin" ? "Admin" : "Host");
  const formattedDate = format(new Date(), "EEEE, MMMM d, yyyy");
  const initials = (displayName || "B")
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase() || "B";

  function isActive(href: string) {
    if (href === ROUTES.dashboard || href === ROUTES.adminHome) {
      return pathname === href;
    }
    return pathname?.startsWith(href) ?? false;
  }

  // Navigation Items Renderer
  const renderNavList = (onNavigate?: () => void, isShrunk = false) => (
    <nav
      className={cn(
        "flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        isShrunk ? "px-2.5 py-3 space-y-4" : "px-4 py-4 space-y-6"
      )}
    >
      {/* Top Action Button (e.g. + New Listing / + Action) */}
      {isShrunk ? (
        <div className="flex justify-center pb-1">
          <Link
            href={role === "admin" ? ROUTES.adminAnnouncements : ROUTES.newListing}
            title={role === "admin" ? "New Announcement" : "New Listing"}
            className="flex size-11 items-center justify-center rounded-2xl bg-[#800020] text-white shadow-xs hover:bg-[#68001a] active:scale-95 transition"
          >
            <Plus className="size-5" />
          </Link>
        </div>
      ) : (
        actionButton && (
          <div className="pb-1" onClick={onNavigate}>
            {actionButton}
          </div>
        )
      )}

      {sections.map((section, sIdx) => {
        if (isShrunk) {
          return (
            <div key={sIdx} className="space-y-2">
              {sIdx > 0 && <div className="my-2 h-px w-8 bg-stone-200/70 mx-auto" />}
              <div className="flex flex-col items-center space-y-2">
                {section.items.map(({ href, label, icon, badge }) => {
                  const active = isActive(href);
                  return (
                    <Link
                      key={href}
                      href={href}
                      onClick={onNavigate}
                      title={label}
                      className={cn(
                        "group relative flex size-12 items-center justify-center rounded-2xl transition-all mx-auto",
                        active
                          ? "bg-[#f4eee8] text-[#800020] shadow-2xs font-bold"
                          : "text-stone-500 hover:bg-stone-100 hover:text-stone-900 font-medium"
                      )}
                    >
                      <Icon
                        icon={icon}
                        className={cn(
                          "size-5.5 transition-colors",
                          active ? "text-[#800020]" : "text-stone-500 group-hover:text-stone-800"
                        )}
                      />
                      {badge !== undefined && (
                        <span className="absolute -top-1 -right-1 flex min-w-4.5 h-4.5 items-center justify-center rounded-full bg-[#800020] px-1 text-[9px] font-bold text-white shadow-xs">
                          {badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        }

        return (
          <div key={sIdx} className="space-y-1">
            {section.title && (
              <p className="px-3 pb-2 text-[10px] font-extrabold uppercase tracking-widest text-stone-400">
                {section.title}
              </p>
            )}
            <div className="space-y-1">
              {section.items.map(({ href, label, icon, badge }) => {
                const active = isActive(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={onNavigate}
                    className={`group flex items-center justify-between rounded-full px-4 py-2.5 text-sm font-semibold transition-all ${
                      active
                        ? "bg-[#f4eee8] text-stone-900 shadow-2xs font-bold"
                        : "text-stone-600 hover:bg-stone-50 hover:text-stone-900 font-medium"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Icon
                        icon={icon}
                        className={`h-4.5 w-4.5 shrink-0 transition-colors ${
                          active ? "text-[#800020]" : "text-stone-400 group-hover:text-stone-700"
                        }`}
                      />
                      <span className="truncate">{label}</span>
                    </div>
                    {badge !== undefined && (
                      <span
                        className={`ml-2 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          active
                            ? "bg-[#800020] text-white"
                            : "bg-stone-100 text-stone-600 group-hover:bg-stone-200"
                        }`}
                      >
                        {badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}
    </nav>
  );

  // Bottom Sidebar Card (Clean minimal on-brand Pro upgrade card or compact icon button)
  const renderSidebarBottomCard = (isShrunk = false) => {
    // Admin is already the administrator of the system — no need to prompt upgrade to Pro
    if (role === "admin") return null;

    if (isShrunk) {
      return (
        <div className="p-2 flex justify-center">
          <Link
            href={ROUTES.dashboardPro}
            title="Beddn Pro Membership"
            className="group relative flex size-11 items-center justify-center rounded-2xl bg-[#fdf2f4] text-[#800020] border border-[#f9c8d4]/70 hover:bg-[#800020] hover:text-white transition shadow-2xs"
          >
            <Crown className="size-5" />
          </Link>
        </div>
      );
    }

    return (
      <div className="p-3 pt-1">
        <div className="rounded-2xl border border-stone-200/80 bg-[#fdf2f4]/60 p-3.5 text-stone-900 shadow-2xs">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="flex size-6 items-center justify-center rounded-lg bg-[#800020] text-white">
              <Crown className="size-3.5" />
            </div>
            <span className="text-xs font-bold text-[#2b000a]">Beddn Pro</span>
          </div>
          <p className="text-[11px] text-stone-600 leading-relaxed">
            Boost listing visibility and get verified badge with priority placement.
          </p>
          <div className="mt-3">
            <Link
              href={ROUTES.dashboardPro}
              className="flex w-full items-center justify-center gap-1.5 rounded-full bg-[#800020] px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-[#68001a] transition active:scale-98"
            >
              <span>Upgrade to Pro</span>
              <ArrowRight className="size-3" />
            </Link>
          </div>
        </div>
      </div>
    );
  };

  // User Profile & Switcher Footer
  const renderSidebarFooter = (onNavigate?: () => void, isShrunk = false) => {
    if (isShrunk) {
      return (
        <div className="border-t border-stone-200/80 p-2.5 flex flex-col items-center gap-2.5 bg-stone-50/50">
          {/* Switch to Admin if applicable */}
          {isAdmin && role === "host" && (
            <Link
              href={ROUTES.adminHome}
              title="Switch to Admin"
              className="flex size-9 items-center justify-center rounded-xl bg-white border border-stone-200/80 text-[#800020] hover:bg-[#fdf2f4] transition"
            >
              <ShieldCheck className="size-4 text-[#800020]" />
            </Link>
          )}

          {/* Switch to Host if applicable */}
          {isAdmin && role === "admin" && (
            <Link
              href={ROUTES.dashboard}
              title="Switch to Host"
              className="flex size-9 items-center justify-center rounded-xl bg-white border border-stone-200/80 text-stone-700 hover:text-[#800020] transition"
            >
              <LayoutDashboard className="size-4" />
            </Link>
          )}

          {/* Browse as traveler */}
          <button
            type="button"
            onClick={() => {
              onNavigate?.();
              setSwitching({ to: ROUTES.home, mode: "traveler" });
            }}
            title="Browse as Traveler"
            className="flex size-9 items-center justify-center rounded-xl text-stone-500 hover:bg-stone-200/60 transition"
          >
            <Compass className="size-4" />
          </button>

          {/* Circular user avatar matching reference */}
          <Link
            href={ROUTES.dashboardProfile}
            title={`${displayName} (${userEmail})`}
            className="group relative my-0.5"
          >
            <Avatar size="lg" className="size-10 rounded-full ring-2 ring-stone-200/80 group-hover:ring-[#800020] transition shadow-2xs">
              <AvatarImage src={resolvedAvatar || ""} alt={displayName} />
              <AvatarFallback className="bg-[#800020] text-white font-bold text-xs uppercase">
                {initials}
              </AvatarFallback>
            </Avatar>
          </Link>



          {/* Sign out */}
          <button
            type="button"
            onClick={handleSignOut}
            title="Sign out"
            className="flex size-8 items-center justify-center rounded-lg text-stone-400 hover:bg-rose-50 hover:text-rose-600 transition"
          >
            <LogOut className="size-3.5" />
          </button>
        </div>
      );
    }

    return (
      <div className="border-t border-stone-100 p-3 bg-stone-50/50">
        {/* Role Switcher Pill */}
        {isAdmin && role === "host" && (
          <Link
            href={ROUTES.adminHome}
            onClick={onNavigate}
            className="mb-2 flex w-full items-center justify-between rounded-xl bg-white border border-stone-200/80 px-3 py-2 text-xs font-bold text-[#800020] hover:bg-[#fdf2f4] transition"
          >
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="size-3.5 text-[#800020]" />
              Switch to Admin
            </span>
            <ArrowRight className="size-3 text-stone-400" />
          </Link>
        )}

        {isAdmin && role === "admin" && (
          <Link
            href={ROUTES.dashboard}
            onClick={onNavigate}
            className="mb-2 flex w-full items-center justify-between rounded-xl bg-white border border-stone-200/80 px-3 py-2 text-xs font-bold text-stone-700 hover:bg-[#fdf2f4] hover:text-[#800020] transition"
          >
            <span className="flex items-center gap-1.5">
              <LayoutDashboard className="size-3.5 text-stone-500" />
              Switch to Host
            </span>
            <ArrowRight className="size-3 text-stone-400" />
          </Link>
        )}

        <button
          type="button"
          onClick={() => {
            onNavigate?.();
            setSwitching({ to: ROUTES.home, mode: "traveler" });
          }}
          className="flex w-full items-center justify-between rounded-xl px-3 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-100 transition"
        >
          <span className="flex items-center gap-2">
            <Compass className="size-3.5 text-stone-400" />
            Browse as Traveler
          </span>
          <ArrowRight className="size-3 text-stone-300" />
        </button>

        {/* User profile card */}
        <div className="mt-2 flex items-center justify-between gap-2 rounded-2xl bg-white p-2.5 border border-stone-200/70 shadow-2xs">
          <Link
            href={ROUTES.dashboardProfile}
            className="flex items-center gap-2.5 min-w-0 flex-1 group"
          >
            <Avatar size="default" className="size-8 rounded-full ring-1 ring-stone-200 group-hover:ring-[#800020] transition">
              <AvatarImage src={resolvedAvatar || ""} alt={displayName} />
              <AvatarFallback className="bg-[#800020] text-white font-bold text-[10px] uppercase">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-bold text-stone-900 group-hover:text-[#800020] transition">{displayName}</p>
              <p className="truncate text-[10px] text-stone-400">{userEmail}</p>
            </div>
          </Link>
          <button
            type="button"
            onClick={handleSignOut}
            title="Sign out"
            className="flex size-7 items-center justify-center rounded-lg text-stone-400 hover:bg-rose-50 hover:text-rose-600 transition"
          >
            <LogOut className="size-3.5" />
          </button>
        </div>


      </div>
    );
  };

  return (
    <div className="flex min-h-screen bg-[#fcfafb] font-sans text-stone-900 antialiased">
      {/* Desktop Left Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-stone-200/80 bg-white transition-all duration-300 ease-in-out md:flex",
          isCollapsed ? "w-20" : "w-64"
        )}
      >
        {/* Brand Header */}
        {isCollapsed ? (
          <div className="relative flex h-18 items-center justify-center gap-0 border-b border-stone-100 px-2 py-3">
            <Link
              href={ROUTES.home}
              title="Beddn Home"
              className="group relative flex size-11 items-center justify-center rounded-2xl bg-stone-900 shadow-xs transition hover:scale-105 active:scale-95 overflow-hidden"
            >
              <Image
                src="/images/logo.png"
                alt="Beddn"
                width={28}
                height={28}
                className="object-contain brightness-0 invert select-none"
              />
            </Link>
            <button
              type="button"
              onClick={toggleSidebar}
              title="Expand sidebar"
              className="absolute right-1 top-1/2 -translate-y-1/2 flex size-7 items-center justify-center rounded-lg text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition active:scale-95 z-10"
              aria-label="Expand sidebar"
            >
              <PanelLeftOpen className="size-3.5" />
            </button>
          </div>
        ) : (
          <div className="flex h-18 items-center justify-between border-b border-stone-100 px-5">
            <Link href={ROUTES.home} className="flex items-center gap-2">
              <Image
                src="/images/logo.png"
                alt="Beddn"
                width={90}
                height={32}
                className="object-contain select-none"
                priority
              />
            </Link>
            <button
              type="button"
              onClick={toggleSidebar}
              title="Shrink sidebar (show icons only)"
              className="flex size-8 items-center justify-center rounded-xl text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition active:scale-95"
              aria-label="Shrink sidebar"
            >
              <PanelLeftClose className="size-4" />
            </button>
          </div>
        )}

        {/* Navigation List */}
        {renderNavList(undefined, isCollapsed)}

        {/* Pro Banner Card */}
        {renderSidebarBottomCard(isCollapsed)}

        {/* Footer Profile & Switcher */}
        {renderSidebarFooter(undefined, isCollapsed)}
      </aside>

      {/* Mobile Drawer */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="flex w-[min(84vw,320px)] flex-col gap-0 bg-white p-0 md:hidden">
          <SheetHeader className="border-b border-stone-100 p-5">
            <div className="flex items-center justify-between">
              <SheetTitle className="font-brand text-2xl font-bold text-[#2b000a]">
                Beddn
              </SheetTitle>
            </div>
            <SheetDescription className="sr-only">Dashboard Navigation</SheetDescription>
          </SheetHeader>
          {renderNavList(() => setMobileMenuOpen(false), false)}
          {renderSidebarBottomCard(false)}
          {renderSidebarFooter(() => setMobileMenuOpen(false), false)}
        </SheetContent>
      </Sheet>

      {/* Main Content Area */}
      <div
        className={cn(
          "flex min-w-0 flex-1 flex-col transition-all duration-300 ease-in-out",
          isCollapsed ? "md:pl-20" : "md:pl-64"
        )}
      >
        {/* Top Greeting Banner with Mesh Gradient Background */}
        <header className="relative overflow-hidden bg-gradient-to-r from-[#1f0007] via-[#480014] to-[#780022] px-4 py-6 sm:px-8 sm:py-7 text-white shadow-md">
          {/* Animated Mesh Gradient Background in Beddn Burgundy Theme */}
          <div className="absolute inset-0 pointer-events-none opacity-75">
            <MeshGradient
              color1="#800020"
              color2="#4a0014"
              color3="#1f0007"
              color4="#2b000a"
              speed={0.6}
              distortion={0.7}
              swirl={0.35}
              softness={0.9}
              shape="wave"
            />
          </div>
          {/* Subtle curved wave background lighting & soft vignette */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_65%_25%,rgba(244,114,182,0.12)_0%,transparent_60%)] pointer-events-none" />
          <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />

          <div className="relative mx-auto flex max-w-7xl flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            {/* Left: Mobile trigger */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                className="flex size-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 md:hidden"
                aria-label="Open navigation menu"
              >
                <Menu className="size-5" />
              </button>
            </div>

            {/* Center: Greeting with User's Name */}
            <div className="text-left lg:text-center">
              <p className="text-[11px] uppercase tracking-widest text-[#f9c8d4]/80 font-medium">
                {greeting}
              </p>
              <h1 className="font-serif italic text-2xl sm:text-3xl lg:text-4xl text-white font-normal tracking-tight leading-tight mt-0.5">
                {userName?.trim() ? userName : displayName}
              </h1>
              <p className="text-[11px] text-[#f9c8d4]/70 mt-1 font-sans">
                {role === "admin" ? "Admin Console" : "Host Dashboard"} · {formattedDate}
              </p>
            </div>

            {/* Right: Notifications & Clean Role Switchers (No weird icon clutter) */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 lg:justify-end">
              <NotificationPopover hostId={hostId} userEmail={userEmail} />

              {/* Role Switcher Pill */}
              {isAdmin && role === "host" && (
                <Link
                  href={ROUTES.adminHome}
                  className="inline-flex h-8.5 items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 text-xs font-bold text-white backdrop-blur-sm transition hover:bg-white/20"
                >
                  <ShieldCheck className="size-3.5 text-white/80" />
                  <span>Admin</span>
                </Link>
              )}

              {isAdmin && role === "admin" && (
                <Link
                  href={ROUTES.dashboard}
                  className="inline-flex h-8.5 items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 text-xs font-bold text-white backdrop-blur-sm transition hover:bg-white/20"
                >
                  <LayoutDashboard className="size-3.5 text-white/80" />
                  <span>Host</span>
                </Link>
              )}

              <Link
                href={ROUTES.home}
                className="inline-flex h-8.5 items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 text-xs font-bold text-white backdrop-blur-sm transition hover:bg-white/20"
              >
                <Compass className="size-3.5 text-white/80" />
                <span>Traveler</span>
              </Link>
            </div>
          </div>
        </header>

        {/* Dashboard Page Body */}
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-8 sm:py-8">
          {children}
        </main>
      </div>

      {/* Role-switch transition overlay */}
      {switching &&
        typeof document !== "undefined" &&
        createPortal(
          <RoleSwitchTransition
            to={switching.to}
            mode={switching.mode}
            onDone={() => setSwitching(null)}
          />,
          document.body
        )}
    </div>
  );
}
