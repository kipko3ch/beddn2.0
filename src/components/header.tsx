"use client";

import { useState, type ReactElement } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAvatarUrl, useUserRole } from "@/lib/hooks";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { AuthDialog } from "@/components/auth-dialog";
import { RoleSwitchTransition } from "@/components/role-switch-transition";
import { CurrencySwitcher } from "@/components/currency-switcher";
import { FloatingNavMenu } from "@/components/floating-nav-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Icon } from "@/components/icon";
import { ROUTES } from "@/lib/routes";

// Same four shortcuts as the homepage hero tabs, shrunk into a persistent
// strip so switching categories doesn't require going back to "/" first.
// "All" is the homepage — that's where every category is browsable at once.
const CATEGORY_LINKS = [
  { label: "All", href: ROUTES.home, icon: "/images/cat-all.png" },
  { label: "Hourly", href: ROUTES.category("hourly"), icon: "/images/cat-hourly.png" },
  { label: "Overnight", href: ROUTES.category("overnight"), icon: "/images/cat-overnight.png" },
];

function CategoryStrip({ pathname }: { pathname: string | null }) {
  return (
    <div className="mx-auto max-w-[1920px] w-full">
      <div className="flex items-center gap-2 overflow-x-auto px-4 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:px-6 lg:px-8">
        {CATEGORY_LINKS.map((cat) => {
          const active = pathname === cat.href;
          return (
            <Link
              key={cat.label}
              href={cat.href}
              className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                active ? "text-crimson" : "text-[#6f6568] hover:text-[#2b000a]"
              }`}
            >
              <Image src={cat.icon} alt="" width={24} height={24} className="h-6 w-6 shrink-0" aria-hidden />
              {cat.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}



export function Header() {
  const { user, isHost, isAdmin, loading } = useUserRole();
  const avatarUrl = useAvatarUrl(user);
  const pathname = usePathname();
  const supabase = createClient();
  const canHost = isHost || isAdmin;
  const rolePending = Boolean(user && loading);
  const showHostWorkspace = canHost || rolePending;

  // Role-switch transition state
  const [switching, setSwitching] = useState<{ to: string; mode: "host" | "traveler" } | null>(null);

  function handleSwitch(to: string, mode: "host" | "traveler") {
    setSwitching({ to, mode });
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  return (
    <>
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b">
        <div className="max-w-7xl mx-auto hidden items-center justify-between gap-3 px-4 sm:px-6 lg:px-8 h-14 sm:h-16 md:flex">
          <Link href={ROUTES.home} className="flex items-center">
            <span className="font-brand text-2xl leading-none text-[#2b000a]">Beddn</span>
          </Link>

          <div className="flex items-center gap-2">
            <Link
              href={ROUTES.home}
              className={`px-3 text-sm transition-colors ${
                pathname === ROUTES.home
                  ? "font-semibold text-[#800020]"
                  : "font-medium text-[#2b000a] hover:text-crimson"
              }`}
            >
              Browse
            </Link>
            <Link
              href={ROUTES.review}
              className={`px-3 text-sm transition-colors ${
                pathname === ROUTES.review
                  ? "font-semibold text-[#800020]"
                  : "font-medium text-[#2b000a] hover:text-crimson"
              }`}
            >
              Review
            </Link>
            {!user && (
              <AuthDialog>
                <Button variant="ghost" size="sm" className="rounded-full">
                  Login
                </Button>
              </AuthDialog>
            )}
            {user && !showHostWorkspace && (
              <Link href={ROUTES.newListing} className="hidden sm:block">
                <Button variant="ghost" size="sm">
                  Become a host
                </Button>
              </Link>
            )}

            {!user && (
              <AuthDialog defaultHostIntent>
                <Button className="h-10 rounded-full bg-black px-6 text-sm font-semibold text-white hover:bg-neutral-800">
                  Become a host
                </Button>
              </AuthDialog>
            )}

            <CurrencySwitcher />

            <FloatingNavMenu
              user={user}
              avatarUrl={avatarUrl}
              showHostWorkspace={showHostWorkspace}
              isAdmin={isAdmin}
              onSignOut={handleSignOut}
              onSwitch={handleSwitch}
            />
          </div>
        </div>
        <div className="relative mx-auto flex h-14 max-w-[1920px] items-center justify-between px-4 sm:px-6 md:hidden">
          <Link href={ROUTES.home} className="font-brand text-2xl leading-none text-[#2b000a]">
            Beddn
          </Link>
          <div className="flex items-center gap-2">
            <CurrencySwitcher />
            <FloatingNavMenu
              user={user}
              avatarUrl={avatarUrl}
              showHostWorkspace={showHostWorkspace}
              isAdmin={isAdmin}
              onSignOut={handleSignOut}
              onSwitch={handleSwitch}
            />
          </div>
        </div>
        {(pathname === ROUTES.home || pathname?.startsWith("/category/")) && (
          <div className="border-t border-black/5">
            <CategoryStrip pathname={pathname} />
          </div>
        )}
      </header>
      <nav className="fixed inset-x-0 bottom-0 z-40 grid w-full grid-cols-4 border-t border-black/10 bg-white px-1.5 pt-1.5 pb-[max(6px,env(safe-area-inset-bottom))] text-center text-[11px] shadow-[0_-4px_16px_rgba(24,17,19,0.05)] md:hidden">
          <Link
            href={ROUTES.home}
            className={`flex flex-col items-center justify-center gap-1 py-1.5 min-h-[52px] font-medium ${
              pathname === ROUTES.home ? "text-[#800020]" : "text-[#6f6568]"
            }`}
          >
            <Icon icon="line-md:home" className="h-6 w-6" />
            Home
          </Link>
          <Link
            href={ROUTES.search}
            className={`flex flex-col items-center justify-center gap-1 py-1.5 min-h-[52px] font-medium ${
              pathname?.startsWith(ROUTES.search) ? "text-[#800020]" : "text-[#6f6568]"
            }`}
          >
            <Icon icon="line-md:search" className="h-6 w-6" />
            Search
          </Link>
          <Link
            href={ROUTES.saved}
            className={`flex flex-col items-center justify-center gap-1 py-1.5 min-h-[52px] font-medium ${
              pathname === ROUTES.saved ? "text-[#800020]" : "text-[#6f6568]"
            }`}
          >
            <Icon icon="line-md:heart" className="h-6 w-6" />
            Saved
          </Link>
          {user && showHostWorkspace ? (
            <button
              type="button"
              onClick={() => handleSwitch(ROUTES.dashboard, "host")}
              className={`flex flex-col items-center justify-center gap-1 py-1.5 min-h-[52px] font-medium ${
                pathname?.startsWith(ROUTES.dashboard) ? "text-[#800020]" : "text-[#6f6568]"
              }`}
            >
              <Icon icon="line-md:account" className="h-6 w-6" />
              Dashboard
            </button>
          ) : user ? (
            <Link
              href={ROUTES.newListing}
              className={`flex flex-col items-center justify-center gap-1 py-1.5 min-h-[52px] font-medium ${
                pathname?.startsWith(ROUTES.newListing) ? "text-[#800020]" : "text-[#6f6568]"
              }`}
            >
              <Icon icon="line-md:briefcase" className="h-6 w-6" />
              Host
            </Link>
          ) : (
            <AuthDialog defaultHostIntent>
              <button className="flex w-full flex-col items-center gap-0.5 rounded-2xl px-2 py-2 text-[#6f6568]">
                <Icon icon="line-md:briefcase" className="h-6 w-6" />
                Host
              </button>
            </AuthDialog>
          )}
      </nav>

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
    </>
  );
}
