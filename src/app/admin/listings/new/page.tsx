"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { ListingForm } from "@/components/listing-form";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ShieldAlert } from "lucide-react";

export default function AdminNewListingPage() {
  const supabase = createClient();
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        router.push("/auth/login?redirect=/admin/listings/new");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", user.user.id)
        .maybeSingle();

      if (!profile?.is_admin) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      setIsAdmin(true);
      setLoading(false);
    }
    checkAuth();
  }, [supabase, router]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#800020] border-t-transparent" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <ShieldAlert className="mx-auto h-12 w-12 text-crimson" />
        <h2 className="mt-4 text-xl font-bold">Admin Access Required</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          You do not have permission to access the admin listing creator.
        </p>
        <Link href="/">
          <Button className="mt-6 rounded-full bg-[#800020] text-white">
            Return to Home
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin/listings">
            <Button variant="ghost" size="sm" className="rounded-full">
              <ArrowLeft className="mr-1 h-4 w-4" />
              Back to listings
            </Button>
          </Link>
          <div>
            <h1 className="font-brand text-2xl font-bold text-[#2b000a]">
              Create Admin Listing
            </h1>
            <p className="text-xs text-muted-foreground">
              Add a listing directly as Beddn admin, assign to a host or keep unclaimed.
            </p>
          </div>
        </div>
      </div>

      <ListingForm isAdmin={true} />
    </div>
  );
}
