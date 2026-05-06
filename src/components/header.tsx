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
import { Menu, User as UserIcon, Heart, LayoutDashboard, LogOut } from "lucide-react";

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

          <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm hover:shadow-sm transition-shadow cursor-pointer">
              <Menu className="h-4 w-4" />
              <UserIcon className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {user ? (
                <>
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
                </>
              ) : (
                <>
                  <DropdownMenuItem onClick={handleSignIn}>
                    Sign in with Google
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Link href="/dashboard/listings/new" className="w-full">
                      List your place
                    </Link>
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
