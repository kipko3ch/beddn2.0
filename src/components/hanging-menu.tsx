"use client";

import { useState, type ReactElement } from "react";
import Image from "next/image";
import Link from "next/link";
import { User } from "@supabase/supabase-js";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/icon";
import { AuthDialog } from "@/components/auth-dialog";
import { ROUTES } from "@/lib/routes";

function getInitials(user: User | null) {
  const name = user?.user_metadata?.full_name || user?.email || "Beddn";
  return name
    .split(/[ @._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part: string) => part[0]?.toUpperCase())
    .join("");
}

export function HangingMenu({
  user,
  avatarUrl,
  showHostWorkspace,
  isAdmin,
  onSignOut,
  trigger,
  align = "end",
}: {
  user: User | null;
  avatarUrl?: string;
  showHostWorkspace: boolean;
  isAdmin: boolean;
  onSignOut: () => void;
  trigger?: ReactElement;
  align?: "start" | "center" | "end";
}) {
  const [open, setOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [authHostIntent, setAuthHostIntent] = useState(false);

  const openAuth = (mode: "signin" | "signup", hostIntent = false) => {
    setAuthMode(mode);
    setAuthHostIntent(hostIntent);
    setAuthOpen(true);
    setOpen(false);
  };

  const fullName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split("@")[0] ||
    "Beddn Guest";
  const email = user?.email || "";

  const defaultTrigger = user ? (
    <button
      type="button"
      aria-label="Open user menu"
      className="group relative flex size-10 items-center justify-center rounded-full border border-stone-200/90 bg-white p-0.5 shadow-xs transition hover:border-[#e8547b] hover:shadow-md focus-visible:ring-2 focus-visible:ring-[#800020] outline-none"
    >
      <Avatar className="size-full">
        <AvatarImage src={avatarUrl} alt={fullName} />
        <AvatarFallback className="bg-gradient-to-br from-[#800020] to-[#e8547b] font-bold text-white text-xs">
          {getInitials(user)}
        </AvatarFallback>
      </Avatar>
      <span className="absolute bottom-0 right-0 size-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
    </button>
  ) : (
    <button
      type="button"
      aria-label="Open menu"
      className="flex items-center gap-2 rounded-full border border-stone-300 bg-white px-3 py-1.5 text-stone-700 shadow-xs transition hover:border-[#800020] hover:bg-[#fdf2f4]/60 hover:shadow-md focus-visible:ring-2 focus-visible:ring-[#800020] outline-none"
    >
      <Icon icon="solar:hamburger-menu-linear" className="size-4.5 text-[#2b000a]" />
      <div className="flex size-6 items-center justify-center rounded-full bg-stone-100 text-stone-500">
        <Icon icon="solar:user-bold" className="size-3.5" />
      </div>
    </button>
  );

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={trigger || defaultTrigger} />
      <PopoverContent
        align={align}
        side="bottom"
        sideOffset={8}
        className="w-[min(90vw,310px)] overflow-hidden rounded-3xl border border-stone-200/90 bg-white p-0 text-stone-900 shadow-2xl ring-1 ring-black/5 animate-in fade-in zoom-in-95 data-[side=bottom]:slide-in-from-top-2"
      >
        {user ? (
          /* ================= SIGNED IN USER ================= */
          <div className="divide-y divide-stone-100">
            {/* Header: Avatar, Name, Email with Active Badge */}
            <div className="flex items-center gap-3.5 p-4 bg-gradient-to-b from-[#fdf2f4]/50 to-white">
              <div className="relative shrink-0">
                <Avatar className="size-12 border-2 border-white shadow-sm ring-1 ring-[#e8547b]/30">
                  <AvatarImage src={avatarUrl} alt={fullName} />
                  <AvatarFallback className="bg-gradient-to-br from-[#800020] to-[#e8547b] font-bold text-white text-sm">
                    {getInitials(user)}
                  </AvatarFallback>
                </Avatar>
                <span
                  title="Active"
                  className="absolute bottom-0 right-0 size-3 rounded-full bg-emerald-500 ring-2 ring-white"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-bold text-[#181113] leading-tight">
                  {fullName}
                </p>
                <p className="truncate text-xs text-stone-500 mt-0.5">{email}</p>
                {showHostWorkspace && (
                  <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-[#fdf2f4] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#a3193d]">
                    <span className="size-1 rounded-full bg-[#a3193d]" /> Host
                  </span>
                )}
              </div>
            </div>

            {/* Main Navigation Actions */}
            <div className="p-2 space-y-0.5">
              {showHostWorkspace ? (
                <>
                  <Link
                    href={ROUTES.dashboardProfile}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium text-stone-700 transition hover:bg-[#fdf2f4] hover:text-[#800020]"
                  >
                    <Icon icon="solar:user-circle-bold-duotone" className="size-5 text-[#800020]" />
                    <span>View Profile</span>
                  </Link>
                  <Link
                    href={ROUTES.dashboard}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium text-stone-700 transition hover:bg-[#fdf2f4] hover:text-[#800020]"
                  >
                    <Icon icon="solar:settings-bold-duotone" className="size-5 text-[#800020]" />
                    <span>Host Dashboard</span>
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href={ROUTES.saved}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium text-stone-700 transition hover:bg-[#fdf2f4] hover:text-[#800020]"
                  >
                    <Icon icon="solar:heart-bold-duotone" className="size-5 text-[#e8547b]" />
                    <span>Saved Trips</span>
                  </Link>
                  <Link
                    href={ROUTES.review}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium text-stone-700 transition hover:bg-[#fdf2f4] hover:text-[#800020]"
                  >
                    <Icon icon="solar:star-bold-duotone" className="size-5 text-amber-500" />
                    <span>Review a Stay</span>
                  </Link>
                </>
              )}

              <Link
                href={ROUTES.home}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium text-stone-700 transition hover:bg-[#fdf2f4] hover:text-[#800020]"
              >
                <Icon icon="solar:magnifer-bold-duotone" className="size-5 text-stone-400" />
                <span>Browse All</span>
              </Link>
            </div>

            {/* Support & Hosting / Admin */}
            <div className="p-2 space-y-0.5">
              <a
                href="https://wa.me/254727993661"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium text-stone-700 transition hover:bg-[#fdf2f4] hover:text-[#800020]"
              >
                <Icon icon="solar:headphones-round-bold-duotone" className="size-5 text-stone-400" />
                <span>Support</span>
              </a>

              {!showHostWorkspace && (
                <Link
                  href={ROUTES.newListing}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium text-stone-700 transition hover:bg-[#fdf2f4] hover:text-[#800020]"
                >
                  <Icon icon="solar:crown-star-bold-duotone" className="size-5 text-[#800020]" />
                  <span>Become a Host</span>
                </Link>
              )}

              {isAdmin && (
                <Link
                  href={ROUTES.adminHome}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium text-stone-700 transition hover:bg-[#fdf2f4] hover:text-[#800020]"
                >
                  <Icon icon="solar:shield-check-bold-duotone" className="size-5 text-[#800020]" />
                  <span>Admin Dashboard</span>
                </Link>
              )}

              {/* Account Switcher option */}
              <button
                type="button"
                onClick={() => openAuth("signin", false)}
                className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm font-medium text-stone-700 transition hover:bg-[#fdf2f4] hover:text-[#800020]"
              >
                <Icon icon="solar:user-plus-bold-duotone" className="size-5 text-stone-400" />
                <span>Switch Account</span>
              </button>
            </div>

            {/* Logout button */}
            <div className="p-2 bg-stone-50/50">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onSignOut();
                }}
                className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm font-bold text-rose-600 transition hover:bg-rose-50"
              >
                <Icon icon="solar:logout-2-bold-duotone" className="size-5 text-rose-600" />
                <span>Log Out</span>
              </button>
            </div>
          </div>
        ) : (
          /* ================= SIGNED OUT VISITOR ================= */
          <div className="divide-y divide-stone-100">
            {/* Top Primary Auth CTA: Never Disappears */}
            <div className="p-4 space-y-2 bg-gradient-to-b from-[#fdf2f4]/60 to-white">
              <p className="font-brand text-xl text-[#2b000a] leading-none mb-1">Welcome to Beddn</p>
              <p className="text-xs text-stone-500 mb-3">Sign in or create an account to start booking.</p>
              <Button
                onClick={() => openAuth("signup", false)}
                className="w-full h-11 rounded-full bg-gradient-to-r from-[#800020] via-[#a3193d] to-[#e8547b] hover:opacity-95 text-white font-bold text-sm shadow-md transition"
              >
                <Icon icon="solar:user-plus-bold" className="mr-2 size-4" />
                Sign up
              </Button>
              <Button
                variant="outline"
                onClick={() => openAuth("signin", false)}
                className="w-full h-11 rounded-full border-stone-300 text-stone-800 font-bold text-sm hover:border-[#800020] hover:bg-[#fdf2f4] hover:text-[#800020] transition"
              >
                <Icon icon="solar:login-2-bold" className="mr-2 size-4" />
                Sign in
              </Button>
            </div>

            {/* Navigation links */}
            <div className="p-2 space-y-0.5">
              <Link
                href={ROUTES.home}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium text-stone-700 transition hover:bg-[#fdf2f4] hover:text-[#800020]"
              >
                <Icon icon="solar:magnifer-bold-duotone" className="size-5 text-stone-400" />
                <span>Browse all</span>
              </Link>
              <Link
                href={ROUTES.review}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium text-stone-700 transition hover:bg-[#fdf2f4] hover:text-[#800020]"
              >
                <Icon icon="solar:star-bold-duotone" className="size-5 text-amber-500" />
                <span>Review a stay</span>
              </Link>
              <Link
                href={ROUTES.saved}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium text-stone-700 transition hover:bg-[#fdf2f4] hover:text-[#800020]"
              >
                <Icon icon="solar:heart-bold-duotone" className="size-5 text-[#e8547b]" />
                <span>Saved trips</span>
              </Link>
            </div>

            {/* Host CTA & Support */}
            <div className="p-2 space-y-0.5">
              <button
                type="button"
                onClick={() => openAuth("signin", true)}
                className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm font-medium text-stone-700 transition hover:bg-[#fdf2f4] hover:text-[#800020]"
              >
                <Icon icon="solar:crown-star-bold-duotone" className="size-5 text-[#800020]" />
                <span>Become a host</span>
              </button>
              <a
                href="https://wa.me/254727993661"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium text-stone-700 transition hover:bg-[#fdf2f4] hover:text-[#800020]"
              >
                <Icon icon="solar:headphones-round-bold-duotone" className="size-5 text-stone-400" />
                <span>Support & Help</span>
              </a>
            </div>

            {/* Terms and Privacy */}
            <div className="p-3 text-xs text-stone-400 flex items-center justify-between">
              <Link href={ROUTES.terms} onClick={() => setOpen(false)} className="hover:underline">
                Terms
              </Link>
              <span>•</span>
              <Link href={ROUTES.privacy} onClick={() => setOpen(false)} className="hover:underline">
                Privacy
              </Link>
              <span>•</span>
              <span>© Beddn</span>
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
    <AuthDialog
      open={authOpen}
      onOpenChange={setAuthOpen}
      mode={authMode}
      defaultHostIntent={authHostIntent}
    />
    </>
  );
}
