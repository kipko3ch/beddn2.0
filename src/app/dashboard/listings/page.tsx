"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/empty-state";
import { BeddnLoader } from "@/components/beddn-loader";
import { Plus, Pencil } from "lucide-react";
import type { Listing } from "@/lib/types";

export default function ListingsPage() {
  const supabase = createClient();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", user.user.id)
        .single();

      let query = supabase
        .from("listings")
        .select("*, listing_images(*), host:hosts(name)")
        .order("created_at", { ascending: false });

      if (!profile?.is_admin) {
        const { data: host } = await supabase
          .from("hosts")
          .select("id")
          .eq("user_id", user.user.id)
          .single();
        if (host) {
          query = query.eq("host_id", host.id);
        } else {
          setListings([]);
          setLoading(false);
          return;
        }
      }

      const { data } = await query;
      setListings((data as Listing[]) ?? []);
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Listings</h1>
        <Link href="/dashboard/listings/new">
          <Button className="bg-[#800020] hover:bg-[#600018] gap-1">
            <Plus className="h-4 w-4" /> New listing
          </Button>
        </Link>
      </div>

      {loading ? <BeddnLoader label="Loading your listings…" /> : listings.length === 0 ? (
        <EmptyState
          image="https://res.cloudinary.com/dzjhuss7i/image/upload/v1781029372/empty-listings_xklz7s.png"
          title="No listings yet"
          subtitle="Create your first listing to start receiving booking requests."
          size="sm"
        />
      ) : (
        <div className="border rounded-lg divide-y">
          {listings.map((listing) => (
            <div
              key={listing.id}
              className="flex items-center justify-between p-4"
            >
              <div>
                <p className="font-medium">{listing.name}</p>
                <p className="text-sm text-muted-foreground">
                  {listing.area}, {listing.city}
                </p>
                <div className="flex gap-1 mt-1">
                  {listing.listing_status === "draft" ? (
                    <Badge className="text-xs bg-amber-100 text-amber-800 hover:bg-amber-100">
                      Draft
                    </Badge>
                  ) : (
                    <Badge
                      variant={listing.is_active ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {listing.is_active ? "Active" : "Inactive"}
                    </Badge>
                  )}
                  <Badge
                    variant={listing.is_verified ? "default" : "outline"}
                    className="text-xs"
                  >
                    {listing.is_verified ? "Verified" : "Badge pending"}
                  </Badge>
                </div>
              </div>
              <Link href={`/dashboard/listings/${listing.id}/edit`}>
                <Button variant="ghost" size="sm" className="gap-1">
                  <Pencil className="h-4 w-4" />
                  {listing.listing_status === "draft" && (
                    <span className="text-xs font-medium">Continue</span>
                  )}
                </Button>
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
