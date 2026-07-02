import { Header } from "@/components/header";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Listing, Review } from "@/lib/types";
import { ExperienceContent } from "@/app/property/[slug]/experience-content";
import { redirect } from "next/navigation";

export default async function ExperienceDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ preview?: string }>;
}) {
  const { slug } = await params;
  const { preview } = await searchParams;
  const isPreview = preview === "1";

  const admin = createAdminClient();

  // Load listing with images, host, reviews, and availability slots
  const { data: listingData } = await admin
    .from("listings")
    .select(
      "*, listing_images(*), host:hosts(user_id, name, bio, avatar_url, is_verified), reviews(*, profile:profiles(full_name)), blocked_dates(date), availability_slots(*)"
    )
    .eq("slug", slug)
    .order("created_at", { ascending: false, referencedTable: "reviews" })
    .maybeSingle();

  if (!listingData) {
    return (
      <>
        <Header />
        <main className="mx-auto max-w-6xl px-4 py-20 text-center sm:px-6">
          <p className="text-lg text-muted-foreground">Experience not found</p>
        </main>
      </>
    );
  }

  // Redirect if this is not actually an experience category
  const categories = (listingData.categories || listingData.category || []) as string[];
  if (!categories.includes("experience")) {
    redirect(`/property/${slug}`);
  }

  let visible = Boolean(listingData.is_active);
  if (!visible && isPreview) {
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

  if (!visible) {
    return (
      <>
        <Header />
        <main className="mx-auto max-w-6xl px-4 py-20 text-center sm:px-6">
          <p className="text-lg text-muted-foreground">Experience not found</p>
        </main>
      </>
    );
  }

  const reviews = (listingData.reviews as Review[]) ?? [];
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const isOwnListing =
    Boolean(auth.user?.id) &&
    (listingData.host as { user_id?: string } | null | undefined)?.user_id === auth.user?.id;

  // Cleanup private columns before page delivery
  delete (listingData as Record<string, unknown>).private_address;
  delete (listingData as Record<string, unknown>).check_in_instructions;
  delete ((listingData.host ?? {}) as Record<string, unknown>).user_id;

  return (
    <>
      <Header />
      {isPreview && !listingData.is_active && (
        <div className="bg-[#8A1C32] px-4 py-2 text-center text-sm font-medium text-white">
          Preview — this is how your experience will look. It is not live yet.
        </div>
      )}
      <ExperienceContent
        listing={listingData as any}
        reviews={reviews}
        isOwnListing={isOwnListing}
      />
    </>
  );
}
