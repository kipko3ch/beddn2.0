"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { ListingForm } from "@/components/listing-form";
import { ExperienceForm } from "@/components/experience-form";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ShieldAlert } from "lucide-react";
import type { Listing } from "@/lib/types";

export default function AdminEditListingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const supabase = createClient();
  const router = useRouter();
  const [listing, setListing] = useState<Listing | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        router.push(`/auth/login?redirect=/admin/listings/${id}`);
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

      const { data } = await supabase
        .from("listings")
        .select("*, listing_images(*), host:hosts(name)")
        .eq("id", id)
        .maybeSingle();

      setListing(data as Listing);
      setLoading(false);
    }
    load();
  }, [id, supabase, router]);

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
          You do not have permission to edit listings from the admin dashboard.
        </p>
        <Link href="/">
          <Button className="mt-6 rounded-full bg-[#800020] text-white">
            Return to Home
          </Button>
        </Link>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <h2 className="text-xl font-bold">Listing not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The requested listing does not exist or has been deleted.
        </p>
        <Link href="/admin/listings">
          <Button className="mt-6 rounded-full bg-[#800020] text-white">
            Back to listings
          </Button>
        </Link>
      </div>
    );
  }

  const isExp = (listing.categories || listing.category || []).includes("experience");

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
              Admin Edit Listing
            </h1>
            <p className="text-xs text-muted-foreground">
              Modify details, reassign host, or update Beddn managed contact details.
            </p>
          </div>
        </div>
      </div>

      {isExp ? (
        <ExperienceForm listing={listing} isAdmin={isAdmin} />
      ) : (
        <ListingForm listing={listing} isAdmin={isAdmin} />
      )}
    </div>
  );
}
