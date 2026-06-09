"use client";

import { useEffect, useState, use } from "react";
import { createClient } from "@/lib/supabase/client";
import { ListingForm } from "@/components/listing-form";
import type { Listing } from "@/lib/types";

export default function EditListingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const supabase = createClient();
  const [listing, setListing] = useState<Listing | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: user } = await supabase.auth.getUser();
      if (user.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("is_admin")
          .eq("id", user.user.id)
          .single();
        setIsAdmin(profile?.is_admin ?? false);
      }

      const { data } = await supabase
        .from("listings")
        .select("*, listing_images(*)")
        .eq("id", id)
        .single();

      setListing(data as Listing);
      setLoading(false);
    }
    load();
  }, [id]);

  if (loading) {
    return null;
  }

  if (!listing) {
    return <p className="text-muted-foreground">Listing not found</p>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Edit listing</h1>
      <ListingForm listing={listing} isAdmin={isAdmin} />
    </div>
  );
}
