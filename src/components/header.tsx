"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useUserRole } from "@/lib/hooks";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { AuthDialog } from "@/components/auth-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Heart, Home, LayoutDashboard, LogIn, LogOut, Menu, Search, ShieldCheck, UserCircle } from "lucide-react";
import { Icon } from "@/components/icon";
import { ROUTES } from "@/lib/routes";
import { useScrollUpVisibility } from "@/lib/use-scroll-up-visibility";

function getAvatarUrl(user: User | null) {
  return user?.user_metadata?.avatar_url || user?.user_metadata?.picture || "";
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

export function Header() {
  const { user, isHost, isAdmin } = useUserRole();
  const pathname = usePathname();
  const supabase = createClient();
  const bottomNavVisible = useScrollUpVisibility();
  const canHost = isHost || isAdmin;

  async function handleSignOut() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  return (
    <>
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b">
        <div className="max-w-7xl mx-auto hidden items-center justify-between gap-3 px-4 h-14 sm:h-16 md:flex">
          <Link href={ROUTES.home} className="flex items-center">
            <span className="font-brand text-2xl leading-none text-[#2b000a]">Beddn</span>
          </Link>

          <div className="flex items-center gap-2">
            <Link href={ROUTES.search} className="px-3 text-sm font-medium text-[#2b000a] hover:text-[#800020]">
              Discover
            </Link>
            <Link href={ROUTES.review} className="px-3 text-sm font-medium text-[#2b000a] hover:text-[#800020]">
              Review
            </Link>
            {!user && (
              <AuthDialog>
                <Button variant="ghost" size="sm" className="rounded-full">
                  Login
                </Button>
              </AuthDialog>
            )}
            {user && !canHost && (
              <Link href={ROUTES.newListing} className="hidden sm:block">
                <Button variant="ghost" size="sm">
                  Become a host
                </Button>
              </Link>
            )}

            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger className="rounded-full outline-none ring-offset-background transition-shadow hover:shadow-sm focus-visible:ring-2 focus-visible:ring-[#800020] focus-visible:ring-offset-2">
                  <Avatar className="size-9 cursor-pointer">
                    <AvatarImage src={getAvatarUrl(user)} alt={user.email ?? "Profile"} />
                    <AvatarFallback className="bg-[#f8eef2] font-semibold text-[#800020]">
                      {getInitials(user)}
                    </AvatarFallback>
                  </Avatar>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem>
                    <Link href={ROUTES.saved} className="flex items-center gap-2 w-full">
                      <Heart className="h-4 w-4" /> Saved trips
                    </Link>
                  </DropdownMenuItem>
                  {canHost ? (
                    <>
                      <DropdownMenuItem>
                        <Link href={ROUTES.dashboard} className="flex items-center gap-2 w-full">
                          <LayoutDashboard className="h-4 w-4" /> Host dashboard
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Link href={ROUTES.search} className="flex items-center gap-2 w-full">
                          <Search className="h-4 w-4" /> Switch to traveler
                        </Link>
                      </DropdownMenuItem>
                    </>
                  ) : (
                    <DropdownMenuItem>
                      <Link href={ROUTES.newListing} className="flex items-center gap-2 w-full">
                        <Home className="h-4 w-4" /> Become a host
                      </Link>
                    </DropdownMenuItem>
                  )}
                  {isAdmin && (
                    <DropdownMenuItem>
                      <Link href={ROUTES.adminListings} className="flex items-center gap-2 w-full">
                        <ShieldCheck className="h-4 w-4" /> Admin dashboard
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut}>
                    <span className="flex items-center gap-2">
                      <LogOut className="h-4 w-4" /> Sign out
                    </span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <AuthDialog defaultHostIntent>
                <Button className="h-10 rounded-full bg-black px-6 text-sm font-semibold text-white hover:bg-neutral-800">
                  Become a host
                </Button>
              </AuthDialog>
            )}
          </div>
        </div>
        <div className="relative mx-auto flex h-14 max-w-7xl items-center justify-center px-4 md:hidden">
          <div className="absolute left-4">
            <Sheet>
              <SheetTrigger
                render={
                  <button
                    type="button"
                    className="inline-flex size-9 items-center justify-center rounded-full text-[#181113] outline-none focus-visible:ring-2 focus-visible:ring-[#800020]"
                  />
                }
              >
                <Menu className="h-5 w-5" />
                <span className="sr-only">Open navigation</span>
              </SheetTrigger>
              <SheetContent side="left" className="w-[min(82vw,320px)] gap-0 bg-white p-0">
                <SheetHeader className="border-b p-5">
                  <SheetTitle className="font-brand text-3xl font-normal leading-none text-[#2b000a]">
                    Beddn
                  </SheetTitle>
                  <SheetDescription>Navigate Beddn</SheetDescription>
                </SheetHeader>
                <nav className="grid gap-2 p-4">
                  <SheetClose
                    render={
                      <Link href={ROUTES.search} className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm hover:bg-muted" />
                    }
                  >
                    <Search className="h-4 w-4" /> Discover
                  </SheetClose>
                  <SheetClose
                    render={
                      <Link href={ROUTES.review} className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm hover:bg-muted" />
                    }
                  >
                    <Heart className="h-4 w-4" /> Review a stay
                  </SheetClose>
                  {!user && (
                    <AuthDialog>
                      <button className="flex items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm hover:bg-muted">
                        <LogIn className="h-4 w-4" /> Login
                      </button>
                    </AuthDialog>
                  )}
                  <SheetClose
                    render={
                      <Link href={ROUTES.saved} className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm hover:bg-muted" />
                    }
                  >
                    <Heart className="h-4 w-4" /> Saved trips
                  </SheetClose>
                  {!canHost ? (
                    <SheetClose
                      render={
                        <Link href={ROUTES.newListing} className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm hover:bg-muted" />
                      }
                    >
                      <Home className="h-4 w-4" /> Become a host
                    </SheetClose>
                  ) : (
                    <SheetClose
                      render={
                        <Link href={ROUTES.dashboard} className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm hover:bg-muted" />
                      }
                    >
                      <LayoutDashboard className="h-4 w-4" /> Dashboard
                    </SheetClose>
                  )}
                  {user && canHost && (
                    <SheetClose
                      render={
                        <Link href={ROUTES.search} className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm hover:bg-muted" />
                      }
                    >
                      <Search className="h-4 w-4" /> Traveler view
                    </SheetClose>
                  )}
                  {isAdmin && (
                    <SheetClose
                      render={
                        <Link href={ROUTES.adminListings} className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm hover:bg-muted" />
                      }
                    >
                      <ShieldCheck className="h-4 w-4" /> Admin dashboard
                    </SheetClose>
                  )}
                  <SheetClose
                    render={
                      <Link href={ROUTES.terms} className="rounded-2xl px-4 py-3 text-sm hover:bg-muted" />
                    }
                  >
                    Terms
                  </SheetClose>
                  <SheetClose
                    render={
                      <Link href={ROUTES.privacy} className="rounded-2xl px-4 py-3 text-sm hover:bg-muted" />
                    }
                  >
                    Privacy
                  </SheetClose>
                </nav>
              </SheetContent>
            </Sheet>
          </div>
          <Link href={ROUTES.home} className="font-brand text-2xl leading-none text-[#2b000a]">
            Beddn
          </Link>
          <div className="absolute right-4">
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger className="rounded-full outline-none ring-offset-background transition-shadow hover:shadow-sm focus-visible:ring-2 focus-visible:ring-[#800020] focus-visible:ring-offset-2">
                  <Avatar className="size-9 cursor-pointer">
                    <AvatarImage src={getAvatarUrl(user)} alt={user.email ?? "Profile"} />
                    <AvatarFallback className="bg-[#f8eef2] text-xs font-medium text-[#800020]">
                      {getInitials(user)}
                    </AvatarFallback>
                  </Avatar>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem>
                    <Link href={ROUTES.saved} className="flex items-center gap-2 w-full">
                      <Heart className="h-4 w-4" /> Saved trips
                    </Link>
                  </DropdownMenuItem>
                  {canHost ? (
                    <>
                      <DropdownMenuItem>
                        <Link href={ROUTES.dashboard} className="flex items-center gap-2 w-full">
                          <LayoutDashboard className="h-4 w-4" /> Host dashboard
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Link href={ROUTES.search} className="flex items-center gap-2 w-full">
                          <Search className="h-4 w-4" /> Switch to traveler
                        </Link>
                      </DropdownMenuItem>
                    </>
                  ) : (
                    <DropdownMenuItem>
                      <Link href={ROUTES.newListing} className="flex items-center gap-2 w-full">
                        <Home className="h-4 w-4" /> Become a host
                      </Link>
                    </DropdownMenuItem>
                  )}
                  {isAdmin && (
                    <DropdownMenuItem>
                      <Link href={ROUTES.adminListings} className="flex items-center gap-2 w-full">
                        <ShieldCheck className="h-4 w-4" /> Admin dashboard
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut}>
                    <span className="flex items-center gap-2">
                      <LogOut className="h-4 w-4" /> Sign out
                    </span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <AuthDialog defaultHostIntent>
                <button className="inline-flex size-9 items-center justify-center rounded-full text-[#181113]">
                  <UserCircle className="h-5 w-5" />
                  <span className="sr-only">Become a host</span>
                </button>
              </AuthDialog>
            )}
          </div>
        </div>
      </header>
      <nav
        className={`fixed inset-x-0 bottom-0 z-40 grid w-full grid-cols-4 border-t border-black/10 bg-white px-1.5 pt-1.5 pb-[max(6px,env(safe-area-inset-bottom))] text-center text-[11px] shadow-[0_-4px_16px_rgba(24,17,19,0.05)] transition-transform duration-300 md:hidden ${
          bottomNavVisible ? "translate-y-0" : "translate-y-full pointer-events-none"
        }`}
      >
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
          {user && canHost ? (
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
