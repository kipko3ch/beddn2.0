"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { User } from "@supabase/supabase-js";
import { Globe, HelpCircle, ChevronRight, LogOut, Compass, ShieldCheck, Heart, Star, Sparkles, Building2 } from "lucide-react";
import { Icon } from "@/components/icon";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AuthDialog } from "@/components/auth-dialog";
import { useCurrency } from "@/components/currency-provider";
import { ROUTES } from "@/lib/routes";

interface FloatingNavMenuProps {
  user: User | null;
  avatarUrl?: string;
  showHostWorkspace: boolean;
  isAdmin: boolean;
  onSignOut: () => void;
  onSwitch: (to: string, mode: "host" | "traveler") => void;
  trigger?: React.ReactNode;
}

export function FloatingNavMenu({
  user,
  avatarUrl,
  showHostWorkspace,
  isAdmin,
  onSignOut,
  onSwitch,
  trigger,
}: FloatingNavMenuProps) {
  const [open, setOpen] = useState(false);
  const { display, setDisplay } = useCurrency();
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) {
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  function getInitials(u: User | null) {
    const name = u?.user_metadata?.full_name || u?.email || "Beddn";
    return name
      .split(/[ @._-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part: string) => part[0]?.toUpperCase())
      .join("");
  }

  const displayName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Traveler";

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      {/* Trigger Button */}
      {trigger ? (
        <div onClick={() => setOpen(!open)} role="button" tabIndex={0} className="cursor-pointer">
          {trigger}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-label="Main navigation menu"
          className="flex h-10 items-center gap-2.5 rounded-full border border-stone-200/90 bg-white px-3.5 py-1 text-stone-800 shadow-2xs outline-none transition-all hover:border-stone-300 hover:shadow-xs focus-visible:ring-2 focus-visible:ring-crimson"
        >
          <Icon icon="line-md:menu" className="h-4.5 w-4.5 text-stone-700" />
          {user ? (
            <Avatar className="size-6.5 border border-stone-200">
              <AvatarImage src={avatarUrl} alt={user.email ?? "Profile"} />
              <AvatarFallback className="bg-[#800020] text-[10px] font-bold text-white">
                {getInitials(user)}
              </AvatarFallback>
            </Avatar>
          ) : (
            <div className="flex size-6.5 items-center justify-center rounded-full bg-stone-100 text-stone-600">
              <Icon icon="line-md:account" className="h-4 w-4" />
            </div>
          )}
        </button>
      )}

      {/* Floating Dropdown Card (matching Image 2) */}
      {open && (
        <div className="absolute right-0 top-full mt-2.5 w-76 sm:w-80 origin-top-right rounded-3xl border border-stone-200/90 bg-white p-3 shadow-2xl ring-1 ring-black/5 animate-in fade-in-0 zoom-in-95 duration-150 z-50 text-stone-800">
          {/* Top Options: Languages & Currency, Help Center */}
          <div className="space-y-0.5">
            <div
              onClick={() => {
                const next = display === "KES" ? "USD" : display === "USD" ? "TZS" : "KES";
                setDisplay(next);
              }}
              className="flex items-center justify-between rounded-2xl px-3.5 py-2.5 text-sm font-medium text-stone-700 hover:bg-stone-50 transition cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <Globe className="h-4 w-4 text-stone-600 shrink-0" />
                <span>Languages &amp; currency</span>
              </div>
              <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-bold text-stone-700">
                {display === "AUTO" ? "KES" : display} · EN
              </span>
            </div>
            <Link
              href={ROUTES.review}
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-sm font-medium text-stone-700 hover:bg-stone-50 transition"
            >
              <HelpCircle className="h-4 w-4 text-stone-600 shrink-0" />
              <span>Help Center & Support</span>
            </Link>
          </div>

          <div className="my-2 border-t border-stone-100" />

          {/* Become a Host Card Section (matching Image 2) */}
          {!showHostWorkspace ? (
            <div className="p-1">
              {user ? (
                <Link
                  href={ROUTES.newListing}
                  onClick={() => setOpen(false)}
                  className="group flex items-center justify-between rounded-2xl bg-gradient-to-r from-[#fdf2f4] to-[#fce4eb] p-3 text-stone-900 border border-[#f9c8d4]/70 transition hover:shadow-xs"
                >
                  <div className="min-w-0 pr-2">
                    <p className="font-bold text-sm text-[#2b000a]">Become a host</p>
                    <p className="text-xs text-stone-600 leading-snug mt-0.5">
                      It&apos;s easy to start hosting and earn extra income.
                    </p>
                  </div>
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white shadow-2xs text-[#800020]">
                    <Building2 className="h-5 w-5" />
                  </div>
                </Link>
              ) : (
                <AuthDialog defaultHostIntent>
                  <button
                    onClick={() => setOpen(false)}
                    className="group flex w-full items-center justify-between rounded-2xl bg-gradient-to-r from-[#fdf2f4] to-[#fce4eb] p-3 text-left text-stone-900 border border-[#f9c8d4]/70 transition hover:shadow-xs"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="font-bold text-sm text-[#2b000a]">Become a host</p>
                      <p className="text-xs text-stone-600 leading-snug mt-0.5">
                        It&apos;s easy to start hosting and earn extra income.
                      </p>
                    </div>
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white shadow-2xs text-[#800020]">
                      <Building2 className="h-5 w-5" />
                    </div>
                  </button>
                </AuthDialog>
              )}
            </div>
          ) : (
            <div className="space-y-0.5">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onSwitch(ROUTES.dashboard, "host");
                }}
                className="flex w-full items-center gap-3 rounded-2xl px-3.5 py-2.5 text-sm font-semibold text-[#800020] hover:bg-[#fdf2f4] transition"
              >
                <Icon icon="solar:widget-2-bold-duotone" className="h-4 w-4" />
                <span>Host Dashboard</span>
              </button>
              <Link
                href={ROUTES.dashboardProfile}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-sm font-medium text-stone-700 hover:bg-stone-50 transition"
              >
                <Icon icon="solar:user-bold-duotone" className="h-4 w-4" />
                <span>Host Profile</span>
              </Link>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onSwitch(ROUTES.home, "traveler");
                }}
                className="flex w-full items-center gap-3 rounded-2xl px-3.5 py-2.5 text-sm font-medium text-stone-600 hover:bg-stone-50 transition"
              >
                <Compass className="h-4 w-4 text-stone-400" />
                <span>Switch to Traveler</span>
              </button>
              {isAdmin && (
                <Link
                  href={ROUTES.adminHome}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-sm font-semibold text-emerald-800 hover:bg-emerald-50 transition"
                >
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  <span>Admin Dashboard</span>
                </Link>
              )}
            </div>
          )}

          <div className="my-2 border-t border-stone-100" />

          {/* Navigation Links (Browse, Review, Saved Trips) */}
          <div className="space-y-0.5">
            <Link
              href={ROUTES.home}
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-2xl px-3.5 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 transition"
            >
              <Icon icon="solar:magnifer-linear" className="h-4 w-4 text-stone-400" />
              <span>Browse Stays</span>
            </Link>
            <Link
              href={ROUTES.saved}
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-2xl px-3.5 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 transition"
            >
              <Heart className="h-4 w-4 text-stone-400" />
              <span>Saved Trips</span>
            </Link>
            <Link
              href={ROUTES.review}
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-2xl px-3.5 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 transition"
            >
              <Star className="h-4 w-4 text-stone-400" />
              <span>Review a Stay</span>
            </Link>
          </div>

          <div className="my-2 border-t border-stone-100" />

          {/* Bottom Section: Log in or Sign up / Sign out */}
          {!user ? (
            <div className="space-y-1.5 p-1">
              <AuthDialog mode="signin">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex w-full items-center justify-between rounded-2xl px-3.5 py-2.5 text-sm font-semibold text-stone-800 hover:bg-stone-50 transition"
                >
                  <span>Log in</span>
                  <ChevronRight className="h-4 w-4 text-stone-400" />
                </button>
              </AuthDialog>
              <AuthDialog mode="signup">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex w-full items-center justify-between rounded-2xl bg-[#800020] px-3.5 py-2.5 text-sm font-bold text-white hover:bg-[#68001a] transition shadow-2xs"
                >
                  <span>Sign up</span>
                  <ChevronRight className="h-4 w-4 text-white/70" />
                </button>
              </AuthDialog>
            </div>
          ) : (
            <div className="space-y-1 p-1">
              <div className="px-3.5 py-1 text-xs text-stone-400 truncate">
                Signed in as <span className="font-semibold text-stone-700">{displayName}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onSignOut();
                }}
                className="flex w-full items-center gap-2 rounded-2xl px-3.5 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50 transition"
              >
                <LogOut className="h-4 w-4" />
                <span>Log out</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
