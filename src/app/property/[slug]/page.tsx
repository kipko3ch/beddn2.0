import { cache } from "react";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Header } from "@/components/header";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Listing, Review } from "@/lib/types";
import { PropertyContent } from "./property-content";
import { ExperienceContent } from "./experience-content";
import { buildListingMetadata, generateListingJsonLd } from "@/lib/seo";

// Cached getter to dedupe listing fetch between generateMetadata and PropertyPage
export const getListingBySlug = cache(async (slug: string) => {
  const admin = createAdminClient();
  const { data } = await admin
    .from("listings")
    .select(
      "*, listing_images(*), host:hosts(user_id, name, bio, avatar_url, is_verified), reviews(*, profile:profiles(full_name)), blocked_dates(date), availability_slots(*)"
    )
    .eq("slug", slug)
    .order("created_at", { ascending: false, referencedTable: "reviews" })
    .maybeSingle();

  if (data && !data.host && data.owner_id) {
    const { data: hostByOwner } = await admin
      .from("hosts")
      .select("user_id, name, bio, avatar_url, is_verified")
      .eq("user_id", data.owner_id)
      .limit(1)
      .maybeSingle();

    if (hostByOwner) {
      data.host = hostByOwner;
    } else {
      const { data: profile } = await admin
        .from("profiles")
        .select("id, full_name, avatar_url")
        .eq("id", data.owner_id)
        .maybeSingle();

      if (profile) {
        data.host = {
          user_id: profile.id,
          name: profile.full_name || "Beddn Host",
          bio: null,
          avatar_url: profile.avatar_url,
          is_verified: false,
        };
      }
    }
  }

  return data;
});

type PropertyPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ preview?: string }>;
};

export async function generateMetadata({
  params,
  searchParams,
}: PropertyPageProps): Promise<Metadata> {
  const { slug } = await params;
  const { preview } = await searchParams;
  const isPreview = preview === "1";

  const listingData = await getListingBySlug(slug);

  if (!listingData || (!listingData.is_active && !isPreview)) {
    return {
      title: "Listing Not Found",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const meta = buildListingMetadata(listingData as Listing);
  if (!listingData.is_active) {
    meta.robots = {
      index: false,
      follow: false,
    };
  }
  return meta;
}

export default async function PropertyPage({
  params,
  searchParams,
}: PropertyPageProps) {
  const { slug } = await params;
  const { preview } = await searchParams;
  const isPreview = preview === "1";

  const admin = createAdminClient();
  const listingData = await getListingBySlug(slug);

  // Redirect to experience details route if listing is an experience
  if (listingData) {
    const cats = (listingData.categories || listingData.category || []) as string[];
    if (cats.includes("experience")) {
      redirect(`/experience/${slug}`);
    }
  }

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
    notFound();
  }


  const reviews = (listingData.reviews as Review[]) ?? [];

  // Blocked dates come from two places: the legacy blocked_dates table and the
  // per-date room/rate calendar (a day is unavailable when the host blocked it
  // or a confirmed booking used up every unit).
  const today = new Date().toISOString().slice(0, 10);
  const { data: calDays } = await admin
    .from("listing_calendar_days")
    .select("date, is_blocked, units_open, price_override")
    .eq("listing_id", listingData.id)
    .gte("date", today);
  const calRows = (calDays as {
    date: string;
    is_blocked: boolean;
    units_open: number | null;
    price_override: number | null;
  }[]) ?? [];
  const calBlocked = calRows
    .filter((d) => d.is_blocked || (d.units_open != null && d.units_open <= 0))
    .map((d) => d.date);

  // date -> nightly price override, so guests see accurate per-date pricing.
  const priceByDate: Record<string, number> = {};
  for (const d of calRows) {
    if (d.price_override != null) priceByDate[d.date] = Number(d.price_override);
  }

  const blockedDateStrings = Array.from(
    new Set([
      ...(((listingData.blocked_dates as { date: string }[]) ?? []).map((item) => item.date)),
      ...calBlocked,
    ])
  );
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const isOwnListing =
    Boolean(auth.user?.id) &&
    (
      (listingData as any).owner_id === auth.user?.id ||
      (listingData.host as { user_id?: string } | null | undefined)?.user_id === auth.user?.id
    );

  const jsonLd = generateListingJsonLd(listingData as Listing, reviews);

  // Never ship private host or owner data to the browser
  delete (listingData as Record<string, unknown>).private_address;
  delete (listingData as Record<string, unknown>).check_in_instructions;
  delete (listingData as Record<string, unknown>).private_owner_name;
  delete (listingData as Record<string, unknown>).private_owner_email;
  delete (listingData as Record<string, unknown>).private_notes;
  delete (listingData as Record<string, unknown>).created_by_admin_id;
  delete ((listingData.host ?? {}) as Record<string, unknown>).user_id;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Header />
      {isPreview && !listingData.is_active && (
        <div className="bg-cranberry px-4 py-2 text-center text-sm font-medium text-white">
          Preview — this is how your listing will look. It is not live to guests yet.
        </div>
      )}
      {((listingData.categories || listingData.category || []) as string[]).includes("experience") ? (
        <ExperienceContent
          listing={listingData as any}
          reviews={reviews}
          isOwnListing={isOwnListing}
        />
      ) : (
        <PropertyContent
          listing={listingData as Listing}
          reviews={reviews}
          blockedDateStrings={blockedDateStrings}
          priceByDate={priceByDate}
          isOwnListing={isOwnListing}
        />
      )}
    </>
  );
}
