import { Header } from "@/components/header";
import { createClient } from "@/lib/supabase/server";
import type { Listing, Review } from "@/lib/types";
import { PropertyContent } from "./property-content";

export default async function PropertyPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ preview?: string }>;
}) {
  const { slug } = await params;
  const { preview } = await searchParams;
  const isPreview = preview === "1";
  const supabase = await createClient();

  // One round trip: pull the listing with its images, host, reviews and blocked
  // dates all embedded, instead of three separate queries.
  let query = supabase
    .from("listings")
    .select(
      "*, listing_images(*), host:hosts(name, is_verified), reviews(*, profile:profiles(full_name)), blocked_dates(date)"
    )
    .eq("slug", slug)
    .order("created_at", { ascending: false, referencedTable: "reviews" });

  // Preview lets an owner/admin see a not-yet-live listing — RLS only returns it
  // to them. Public visitors still only get active listings.
  if (!isPreview) {
    query = query.eq("is_active", true);
  }

  const { data: listingData } = await query.single();

  if (!listingData) {
    return (
      <>
        <Header />
        <main className="mx-auto max-w-6xl px-4 py-20 text-center sm:px-6">
          <p className="text-lg text-muted-foreground">Listing not found</p>
        </main>
      </>
    );
  }

  const reviews = (listingData.reviews as Review[]) ?? [];
  const blockedDateStrings = ((listingData.blocked_dates as { date: string }[]) ?? []).map(
    (item) => item.date
  );

  return (
    <>
      <Header />
      {isPreview && !listingData.is_active && (
        <div className="bg-[#800020] px-4 py-2 text-center text-sm font-medium text-white">
          Preview — this is how your listing will look. It is not live to guests yet.
        </div>
      )}
      <PropertyContent
        listing={listingData as Listing}
        reviews={reviews}
        blockedDateStrings={blockedDateStrings}
      />
    </>
  );
}
