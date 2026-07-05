"use client";

import type { ReactElement } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAvatarUrl, useUserRole } from "@/lib/hooks";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { AuthDialog } from "@/components/auth-dialog";
import { CurrencySwitcher } from "@/components/currency-switcher";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
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
  { label: "Experiences", href: ROUTES.category("experience"), icon: "/images/cat-experiences.png" },
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

function getInitials(user: User | null) {
  const name = user?.user_metadata?.full_name || user?.email || "Beddn";
  return name
    .split(/[ @._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part: string) => part[0]?.toUpperCase())
    .join("");
}

/**
 * Single control that opens the full nav sheet — the avatar itself when
 * signed in (no separate avatar-dropdown + hamburger pair), a hamburger icon
 * when signed out.
 */
function MenuTrigger({
  user,
  avatarUrl,
  ref,
  ...props
}: { user: User | null; avatarUrl?: string } & React.ComponentPropsWithRef<"button">) {
  // SheetTrigger's `render` prop clones onClick/aria/data-* attributes onto
  // whatever element we return — they MUST land on the real <button>, so
  // `...props` (and `ref`) have to be spread here, not swallowed by this
  // wrapper component.
  if (user) {
    return (
      <button
        {...props}
        ref={ref}
        type="button"
        aria-label="Open menu"
        className="rounded-full outline-none ring-offset-background transition-shadow hover:shadow-sm focus-visible:ring-2 focus-visible:ring-crimson focus-visible:ring-offset-2"
      >
        <Avatar className="size-9 cursor-pointer">
          <AvatarImage src={avatarUrl} alt={user.email ?? "Profile"} />
          <AvatarFallback className="bg-cream/60 font-semibold text-crimson">
            {getInitials(user)}
          </AvatarFallback>
        </Avatar>
      </button>
    );
  }
  return (
    <button
      {...props}
      ref={ref}
      type="button"
      aria-label="Open menu"
      className="inline-flex size-9 items-center justify-center rounded-full border text-[#181113] outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-crimson"
    >
      <Icon icon="line-md:menu" className="h-5 w-5" />
    </button>
  );
}

/**
 * The full navigation menu, shown as a slide-out sheet. One combined trigger
 * (avatar or hamburger) replaces what used to be a separate avatar dropdown
 * and hamburger button. Primary links sit at the top; Terms/Privacy and Sign
 * out are pinned to the bottom.
 */
function NavSheet({
  user,
  showHostWorkspace,
  isAdmin,
  onSignOut,
  side,
  children,
}: {
  user: User | null;
  showHostWorkspace: boolean;
  isAdmin: boolean;
  onSignOut: () => void;
  side: "left" | "right";
  children: ReactElement;
}) {
  const item = "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm hover:bg-muted";
  return (
    <Sheet>
      <SheetTrigger render={children} />
      <SheetContent side={side} className="flex w-[min(82vw,320px)] flex-col gap-0 bg-white p-0">
        <SheetHeader className="border-b p-5">
          <SheetTitle className="font-brand text-3xl font-normal leading-none text-[#2b000a]">
            Beddn
          </SheetTitle>
          <SheetDescription className="sr-only">Navigate Beddn</SheetDescription>
        </SheetHeader>

        <nav className="flex-1 space-y-1 overflow-y-auto p-4">
          <SheetClose render={<Link href={ROUTES.home} className={item} />}>
            <Icon icon="line-md:search" className="h-4 w-4" /> Browse all
          </SheetClose>
          <SheetClose render={<Link href={ROUTES.review} className={item} />}>
            <Icon icon="line-md:star" className="h-4 w-4" /> Review a stay
          </SheetClose>
          <SheetClose render={<Link href={ROUTES.saved} className={item} />}>
            <Icon icon="line-md:heart" className="h-4 w-4" /> Saved trips
          </SheetClose>

          {!user && (
            <AuthDialog>
              <button className={`${item} w-full text-left`}>
                <Icon icon="line-md:log-in" className="h-4 w-4" /> Login or sign up
              </button>
            </AuthDialog>
          )}

          {showHostWorkspace ? (
            <>
              <SheetClose render={<Link href={ROUTES.dashboard} className={item} />}>
                <Icon icon="line-md:account" className="h-4 w-4" /> Host dashboard
              </SheetClose>
              <SheetClose render={<Link href={ROUTES.dashboardProfile} className={item} />}>
                <Icon icon="line-md:account" className="h-4 w-4" /> Host profile
              </SheetClose>
              <SheetClose render={<Link href={ROUTES.home} className={item} />}>
                <Icon icon="line-md:search" className="h-4 w-4" /> Switch to traveler
              </SheetClose>
            </>
          ) : user ? (
            <SheetClose render={<Link href={ROUTES.newListing} className={item} />}>
              <Icon icon="line-md:briefcase" className="h-4 w-4" /> Become a host
            </SheetClose>
          ) : (
            <AuthDialog defaultHostIntent>
              <button className={`${item} w-full text-left`}>
                <Icon icon="line-md:briefcase" className="h-4 w-4" /> Become a host
              </button>
            </AuthDialog>
          )}

          {isAdmin && (
            <SheetClose render={<Link href={ROUTES.adminHome} className={item} />}>
              <Icon icon="line-md:check-all" className="h-4 w-4" /> Admin dashboard
            </SheetClose>
          )}
        </nav>

        <div className="mt-auto space-y-1 border-t p-4">
          <SheetClose render={<Link href={ROUTES.terms} className={`${item} text-muted-foreground`} />}>
            Terms
          </SheetClose>
          <SheetClose render={<Link href={ROUTES.privacy} className={`${item} text-muted-foreground`} />}>
            Privacy
          </SheetClose>
          {user && (
            <button onClick={onSignOut} className={`${item} w-full text-left text-cranberry`}>
              <Icon icon="line-md:log-out" className="h-4 w-4" /> Sign out
            </button>
          )}
        </div>
      </SheetContent>
    </Sheet>
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
            <Link href={ROUTES.home} className="px-3 text-sm font-medium text-[#2b000a] hover:text-crimson">
              Browse
            </Link>
            <Link href={ROUTES.review} className="px-3 text-sm font-medium text-[#2b000a] hover:text-crimson">
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

            {/* One control: the avatar itself when signed in, a hamburger
                when signed out. Opens the full menu — no separate dropdown. */}
            <NavSheet
              user={user}
              showHostWorkspace={showHostWorkspace}
              isAdmin={isAdmin}
              onSignOut={handleSignOut}
              side="right"
            >
              <MenuTrigger user={user} avatarUrl={avatarUrl} />
            </NavSheet>
          </div>
        </div>
        <div className="relative mx-auto flex h-14 max-w-[1920px] items-center justify-center px-4 sm:px-6 md:hidden">
          <div className="absolute left-4 flex items-center gap-1.5">
            <NavSheet
              user={user}
              showHostWorkspace={showHostWorkspace}
              isAdmin={isAdmin}
              onSignOut={handleSignOut}
              side="left"
            >
              <MenuTrigger user={user} avatarUrl={avatarUrl} />
            </NavSheet>
          </div>
          <Link href={ROUTES.home} className="font-brand text-2xl leading-none text-[#2b000a]">
            Beddn
          </Link>
          <div className="absolute right-4">
            <CurrencySwitcher />
          </div>
        </div>
        {!pathname?.startsWith('/property/') && !pathname?.startsWith('/experience/') && !pathname?.startsWith('/reserve/') && !pathname?.startsWith('/search') && (
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
            <Link
              href={ROUTES.dashboard}
              className={`flex flex-col items-center justify-center gap-1 py-1.5 min-h-[52px] font-medium ${
                pathname?.startsWith(ROUTES.dashboard) ? "text-[#800020]" : "text-[#6f6568]"
              }`}
            >
              <Icon icon="line-md:account" className="h-6 w-6" />
              Dashboard
            </Link>
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
    </>
  );
}
