"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Heart, LayoutDashboard, LogOut } from "lucide-react";

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

  async function handleSignIn() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/api/auth/callback` },
    });
  }

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 px-4 h-14 sm:h-16">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/logo.png" alt="Beddn" width={28} height={28} />
          <span className="text-lg sm:text-xl font-bold tracking-tight">Beddn</span>
        </Link>

        <div className="flex items-center gap-2">
          {user && (
            <Link href="/dashboard/listings/new" className="hidden sm:block">
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
                  <Link href="/saved" className="flex items-center gap-2 w-full">
                    <Heart className="h-4 w-4" /> Saved trips
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Link href="/dashboard" className="flex items-center gap-2 w-full">
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
            <Button
              onClick={handleSignIn}
              className="rounded-full bg-black px-5 text-white hover:bg-neutral-800"
              size="sm"
            >
              Sign in
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
