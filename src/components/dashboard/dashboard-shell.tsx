"use client";

import Link from "next/link";
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
} from "lucide-react";
import { MeshGradient } from "@/components/ui/mesh-gradient";
import { createClient } from "@/lib/supabase/client";
import { ROUTES } from "@/lib/routes";
import { Icon } from "@/components/icon";
import { RoleSwitchTransition } from "@/components/role-switch-transition";
import { NotificationPopover } from "@/components/dashboard/notification-popover";
import { ProUpgradeModal } from "@/components/dashboard/pro-upgrade-modal";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";

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
  const [switching, setSwitching] = useState<{ to: string; mode: "host" | "traveler" } | null>(null);
  const supabase = createClient();

  // Close mobile drawer on route changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    window.location.href = ROUTES.home;
  }

  // Greeting based on current hour
  const currentHour = new Date().getHours();
  const greeting = currentHour < 12 ? "Good Morning" : currentHour < 17 ? "Good Afternoon" : "Good Evening";
  const displayName = userName || userEmail.split("@")[0] || (role === "admin" ? "Admin" : "Host");
  const formattedDate = format(new Date(), "EEEE, MMMM d, yyyy");

  function isActive(href: string) {
    if (href === ROUTES.dashboard || href === ROUTES.adminHome) {
      return pathname === href;
    }
    return pathname?.startsWith(href) ?? false;
  }

  // Navigation Items Renderer
  const renderNavList = (onNavigate?: () => void) => (
    <nav className="flex-1 space-y-6 overflow-y-auto px-4 py-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {/* Top Action Button (e.g. + New Listing / + Action) */}
      {actionButton && (
        <div className="pb-1" onClick={onNavigate}>
          {actionButton}
        </div>
      )}

      {sections.map((section, sIdx) => (
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
      ))}
    </nav>
  );

  // Bottom Sidebar Card (Clean minimal on-brand Pro upgrade card)
  const renderSidebarBottomCard = () => {
    return (
      <div className="p-3 pt-1">
        <div className="rounded-2xl border border-stone-200/80 bg-[#fdf2f4]/60 p-3.5 text-stone-900 shadow-2xs">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="flex size-6 items-center justify-center rounded-lg bg-[#800020] text-white">
              <Sparkles className="size-3.5" />
            </div>
            <span className="text-xs font-bold text-[#2b000a]">Beddn Pro</span>
          </div>
          <p className="text-[11px] text-stone-600 leading-relaxed">
            Boost listing visibility and get verified badge with priority placement.
          </p>
          <div className="mt-3">
            <ProUpgradeModal
              hostName={displayName}
              activeTier={activeTier}
              expiresAt={activeTierExpires}
              trigger={
                <button className="flex w-full items-center justify-center gap-1.5 rounded-full bg-[#800020] px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-[#68001a] transition active:scale-98">
                  <span>Upgrade to Pro</span>
                  <ArrowRight className="size-3" />
                </button>
              }
            />
          </div>
        </div>
      </div>
    );
  };

  // User Profile & Switcher Footer
  const renderSidebarFooter = (onNavigate?: () => void) => (
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
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-bold text-stone-900">{displayName}</p>
          <p className="truncate text-[10px] text-stone-400">{userEmail}</p>
        </div>
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

  return (
    <div className="flex min-h-screen bg-[#fcfafb] font-sans text-stone-900 antialiased">
      {/* Desktop Left Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-stone-200/80 bg-white md:flex">
        {/* Brand Header */}
        <div className="flex h-18 items-center justify-between border-b border-stone-100 px-6">
          <Link href={ROUTES.home} className="flex items-center gap-2">
            <span className="font-brand text-2xl font-bold tracking-tight text-[#2b000a]">Beddn</span>
          </Link>
          <span className="rounded-full bg-[#fdf2f4] px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-wider text-[#800020] border border-[#f9c8d4]">
            {role === "admin" ? "Admin" : "Host"}
          </span>
        </div>

        {/* Navigation List */}
        {renderNavList()}

        {/* Pro Banner Card */}
        {renderSidebarBottomCard()}

        {/* Footer Profile & Switcher */}
        {renderSidebarFooter()}
      </aside>

      {/* Mobile Drawer */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="flex w-[min(84vw,320px)] flex-col gap-0 bg-white p-0 md:hidden">
          <SheetHeader className="border-b border-stone-100 p-5">
            <div className="flex items-center justify-between">
              <SheetTitle className="font-brand text-2xl font-bold text-[#2b000a]">
                Beddn
              </SheetTitle>
              <span className="rounded-full bg-[#fdf2f4] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#800020]">
                {role === "admin" ? "Admin" : "Host"}
              </span>
            </div>
            <SheetDescription className="sr-only">Dashboard Navigation</SheetDescription>
          </SheetHeader>
          {renderNavList(() => setMobileMenuOpen(false))}
          {renderSidebarBottomCard()}
          {renderSidebarFooter(() => setMobileMenuOpen(false))}
        </SheetContent>
      </Sheet>

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col md:pl-64">
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
