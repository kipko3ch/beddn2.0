"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Heart, Home, LayoutDashboard, LogOut, Search, UserCircle } from "lucide-react";
import { ROUTES } from "@/lib/routes";
import { LOGO_SRC } from "@/lib/assets";

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
  const [user, setUser] = useState<User | null>(null);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
    setUser(null);
    window.location.href = "/";
  }

  return (
    <>
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 px-4 h-14 sm:h-16">
          <Link href={ROUTES.home} className="flex items-center gap-2">
            <Image src={LOGO_SRC} alt="Beddn" width={22} height={32} unoptimized className="h-8 w-auto object-contain" />
            <span className="text-lg sm:text-xl font-bold tracking-tight">Beddn</span>
          </Link>

          <div className="flex items-center gap-2">
            {user && (
              <Link href={ROUTES.newListing} className="hidden sm:block">
                <Button variant="ghost" size="sm">
                  List your place
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
                  <DropdownMenuItem>
                    <Link href={ROUTES.dashboard} className="flex items-center gap-2 w-full">
                      <LayoutDashboard className="h-4 w-4" /> Dashboard
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut}>
                    <span className="flex items-center gap-2">
                      <LogOut className="h-4 w-4" /> Sign out
                    </span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <AuthDialog>
                <Button
                  className="rounded-full bg-black px-5 text-white hover:bg-neutral-800"
                  size="sm"
                >
                  Sign in
                </Button>
              </AuthDialog>
            )}
          </div>
        </div>
      </header>
      <nav
        className="md:hidden"
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          top: "auto",
          zIndex: 80,
          borderTop: "1px solid #eee",
          background: "rgba(255,255,255,0.96)",
          padding: "8px 12px",
          boxShadow: "0 -8px 24px rgba(0,0,0,0.08)",
          backdropFilter: "blur(12px)",
        }}
      >
        <div className="mx-auto grid max-w-md grid-cols-4 text-center text-xs font-semibold">
          <Link href={ROUTES.home} className="flex flex-col items-center gap-1 rounded-xl px-2 py-1 hover:bg-muted">
            <Home className="h-5 w-5" />
            Home
          </Link>
          <Link href={ROUTES.search} className="flex flex-col items-center gap-1 rounded-xl px-2 py-1 hover:bg-muted">
            <Search className="h-5 w-5" />
            Search
          </Link>
          <Link href={ROUTES.saved} className="flex flex-col items-center gap-1 rounded-xl px-2 py-1 hover:bg-muted">
            <Heart className="h-5 w-5" />
            Saved
          </Link>
          {user ? (
            <Link href={ROUTES.dashboard} className="flex flex-col items-center gap-1 rounded-xl px-2 py-1 hover:bg-muted">
              <UserCircle className="h-5 w-5" />
              Account
            </Link>
          ) : (
            <AuthDialog>
              <button className="flex w-full flex-col items-center gap-1 rounded-xl px-2 py-1 hover:bg-muted">
                <UserCircle className="h-5 w-5" />
                Sign in
              </button>
            </AuthDialog>
          )}
        </div>
      </nav>
    </>
  );
}
