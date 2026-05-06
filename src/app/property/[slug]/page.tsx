import { Header } from "@/components/header";
import { createClient } from "@/lib/supabase/server";
import type { Listing, Review } from "@/lib/types";
import { PropertyContent } from "./property-content";

export default async function PropertyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: listingData } = await supabase
    .from("listings")
    .select("*, listing_images(*), host:hosts(name, phone, is_verified)")
    .eq("slug", slug)
    .eq("is_active", true)
    .eq("is_verified", true)
    .single();

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

  const [reviewsRes, blockedRes] = await Promise.all([
    supabase
      .from("reviews")
      .select("*, profile:profiles(full_name)")
      .eq("listing_id", listingData.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("blocked_dates")
      .select("date")
      .eq("listing_id", listingData.id),
  ]);

  return (
    <>
      <Header />
      <PropertyContent
        listing={listingData as Listing}
        reviews={(reviewsRes.data as Review[]) ?? []}
        blockedDateStrings={(blockedRes.data ?? []).map((item: { date: string }) => item.date)}
      />
    </>
  );
}
