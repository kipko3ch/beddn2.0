import { Header } from "@/components/header";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
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
  // Service role: public listing pages must work for everyone (signed in or
  // not) regardless of RLS policy state. Visibility is enforced explicitly:
  // inactive listings are only shown to their owner or an admin via preview.
  const admin = createAdminClient();

  // One round trip: listing with images, host, reviews and blocked dates.
  const { data: listingData } = await admin
    .from("listings")
    .select(
      "*, listing_images(*), host:hosts(user_id, name, bio, avatar_url, is_verified), reviews(*, profile:profiles(full_name)), blocked_dates(date)"
    )
    .eq("slug", slug)
    .order("created_at", { ascending: false, referencedTable: "reviews" })
    .maybeSingle();

  let visible = Boolean(listingData?.is_active);
  if (listingData && !visible && isPreview) {
    const supabase = await createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (auth.user) {
      const ownerId = (listingData.host as { user_id?: string } | null)?.user_id;
      if (ownerId === auth.user.id) {
        visible = true;
      } else {
        const { data: profile } = await admin
          .from("profiles")
          .select("is_admin")
          .eq("id", auth.user.id)
          .maybeSingle();
        visible = Boolean(profile?.is_admin);
      }
    }
  }

  if (!listingData || !visible) {
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
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const isOwnListing =
    Boolean(auth.user?.id) &&
    (listingData.host as { user_id?: string } | null | undefined)?.user_id === auth.user?.id;

  // Never ship private host data to the browser — the exact address and
  // check-in details unlock only after a confirmed booking.
  delete (listingData as Record<string, unknown>).private_address;
  delete (listingData as Record<string, unknown>).check_in_instructions;
  delete ((listingData.host ?? {}) as Record<string, unknown>).user_id;

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
        isOwnListing={isOwnListing}
      />
    </>
  );
}
